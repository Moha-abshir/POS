import rateLimit from 'express-rate-limit';
import { Request } from 'express';

// 1. Email-Based Limiting for Auth APIs
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 5,
  message: {
    success: false,
    error: {
      code: 'TOO_MANY_REQUESTS',
      message: 'Too many authentication attempts. Please try again after 15 minutes.',
    }
  },
  keyGenerator: (req: Request) => {
    // If email is provided in the body, limit by email to prevent blocking other users on the same IP.
    if (req.body && req.body.email) {
      return `auth_${req.body.email.toLowerCase()}`;
    }
    // Fallback to IP if email isn't present
    return `auth_${req.ip}`;
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// 2. M-Pesa STK Push Limiters
// Layer 1: The Shield (Customer Level) - Max 2 per 5 minutes per phone number
export const mpesaCustomerLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  limit: 2,
  message: {
    success: false,
    error: {
      code: 'TOO_MANY_REQUESTS',
      message: 'Too many STK push requests for this phone number. Please wait before trying again.',
    }
  },
  keyGenerator: (req: Request) => {
    if (req.body && req.body.phoneNumber) {
      return `mpesa_cust_${req.body.phoneNumber}`;
    }
    return `mpesa_cust_${req.ip}`;
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Layer 2: The Cost Guard (Tenant Level) - Max 10 per minute per business_id
export const mpesaTenantLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  limit: 10,
  message: {
    success: false,
    error: {
      code: 'TOO_MANY_REQUESTS',
      message: 'Too many STK push requests for this business. Please slow down.',
    }
  },
  keyGenerator: (req: Request) => {
    const anyReq = req as any;
    if (anyReq.user && anyReq.user.businessId) {
      return `mpesa_tenant_${anyReq.user.businessId}`;
    }
    return `mpesa_tenant_${req.ip}`;
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// 3. Global API Limiter (Smart Context Limiting)
export const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 600, // ~40 req/min
  message: {
    success: false,
    error: {
      code: 'TOO_MANY_REQUESTS',
      message: 'You have exceeded your API request quota. Please slow down.',
    }
  },
  keyGenerator: (req: Request) => {
    const anyReq = req as any;
    // Limit by Tenant ID if the user is authenticated
    if (anyReq.user && anyReq.user.businessId) {
      return `global_tenant_${anyReq.user.businessId}`;
    }
    // Limit by IP if anonymous traffic
    return `global_ip_${req.ip}`;
  },
  standardHeaders: true,
  legacyHeaders: false,
});
