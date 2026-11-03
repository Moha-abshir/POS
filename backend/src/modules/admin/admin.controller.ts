import { Request, Response, NextFunction } from 'express';
import { AdminService } from './admin.service';
import { z } from 'zod';

const requestOtpSchema = z.object({
  email: z.string().email(),
});

const verifyOtpSchema = z.object({
  email: z.string().email(),
  otp: z.string().length(6),
});

export class AdminController {
  static async requestOtp(req: Request, res: Response, next: NextFunction) {
    try {
      const { email } = requestOtpSchema.parse(req.body);
      await AdminService.requestOtp(email);
      res.json({
        success: true,
        message: 'Admin OTP sent successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  static async verifyOtp(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, otp } = verifyOtpSchema.parse(req.body);
      const { accessToken, admin } = await AdminService.verifyOtp(email, otp);

      res.json({
        success: true,
        data: {
          accessToken,
          user: admin, // Return inside 'user' to align with client expectations
        }
      });
    } catch (error) {
      next(error);
    }
  }

  static async getMetrics(req: Request, res: Response, next: NextFunction) {
    try {
      const metrics = await AdminService.getMetrics();
      res.json({
        success: true,
        data: metrics,
      });
    } catch (error) {
      next(error);
    }
  }

  static async getBusinesses(req: Request, res: Response, next: NextFunction) {
    try {
      const status = req.query.status as string | undefined;
      const businessesList = await AdminService.getBusinesses(status);
      res.json({
        success: true,
        data: businessesList,
      });
    } catch (error) {
      next(error);
    }
  }

  static async approve(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const adminId = (req as any).user.id;
      const data = await AdminService.approveBusiness(id, adminId);
      res.json({
        success: true,
        message: 'Business approved successfully',
        data
      });
    } catch (error) {
      next(error);
    }
  }

  static async reject(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const data = await AdminService.rejectBusiness(id);
      res.json({
        success: true,
        message: 'Business rejected successfully',
        data
      });
    } catch (error) {
      next(error);
    }
  }

  static async suspend(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const data = await AdminService.suspendBusiness(id);
      res.json({
        success: true,
        message: 'Business suspended successfully',
        data
      });
    } catch (error) {
      next(error);
    }
  }

  static async reactivate(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const data = await AdminService.reactivateBusiness(id);
      res.json({
        success: true,
        message: 'Business reactivated successfully',
        data
      });
    } catch (error) {
      next(error);
    }
  }

  static async deleteBusiness(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const data = await AdminService.deleteBusiness(id);
      res.json({
        success: true,
        message: 'Business deleted successfully',
        data
      });
    } catch (error) {
      next(error);
    }
  }

  static async updateProductMode(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const { productMode } = req.body;
      if (productMode !== 'SIMPLE' && productMode !== 'ADVANCED') {
        return res.status(400).json({ 
          success: false, 
          error: { message: 'Invalid product mode. Must be SIMPLE or ADVANCED' } 
        });
      }
      const data = await AdminService.updateBusinessProductMode(id, productMode);
      res.json({
        success: true,
        message: `Product mode changed to ${productMode === 'SIMPLE' ? 'Simple Flat' : 'Advanced'} mode successfully`,
        data
      });
    } catch (error) {
      next(error);
    }
  }
}
