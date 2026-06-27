import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { db } from '../../db';
import { businesses } from '../../db/schema';
import { eq } from 'drizzle-orm';

const JWT_SECRET = process.env.JWT_SECRET!;

export interface AuthUser {
  id: string;
  email: string;
  role: string;
  businessId: string;
  type: 'user' | 'admin';
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export const authenticate = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: 'No token provided',
      }
    });
  }

  const token = authHeader.split(' ')[1];

  try {
    const payload = jwt.verify(token, JWT_SECRET) as any;
    
    req.user = {
      id: payload.sub || payload.adminId,
      email: payload.email,
      role: payload.role,
      businessId: payload.businessId || '',
      type: payload.type || 'user',
    };
    
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: 'Invalid or expired token',
      }
    });
  }
};

export const authorize = (roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'You do not have permission to perform this action',
        }
      });
    }
    next();
  };
};

export const requireAdmin = (req: Request, res: Response, next: NextFunction) => {
  if (!req.user || req.user.type !== 'admin') {
    return res.status(403).json({
      success: false,
      error: {
        code: 'FORBIDDEN',
        message: 'Admin access required',
      }
    });
  }
  next();
};

export const requireActiveBusiness = async (req: Request, res: Response, next: NextFunction) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: 'Authentication required',
      }
    });
  }

  // Admins are not allowed to access tenant routes
  if (req.user.type === 'admin') {
    return res.status(403).json({
      success: false,
      error: {
        code: 'FORBIDDEN',
        message: 'Platform administrators cannot access tenant endpoints',
      }
    });
  }

  if (!req.user.businessId) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'BAD_REQUEST',
        message: 'User is not associated with any business',
      }
    });
  }

  try {
    const [business] = await db.select().from(businesses).where(eq(businesses.id, req.user.businessId));
    if (!business) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'BUSINESS_NOT_FOUND',
          message: 'Associated business not found',
        }
      });
    }

    if (business.status !== 'active') {
      let redirectUrl = '/awaiting-approval';
      if (business.status === 'suspended') {
        redirectUrl = '/account-suspended';
      } else if (business.status === 'rejected') {
        redirectUrl = '/account-rejected';
      }

      return res.status(403).json({
        success: false,
        error: {
          code: 'INACTIVE_BUSINESS',
          message: `Business is ${business.status}`,
          status: business.status,
          redirect: redirectUrl
        }
      });
    }

    next();
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to verify business status',
      }
    });
  }
};
