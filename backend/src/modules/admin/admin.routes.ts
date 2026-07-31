import { Router } from 'express';
import { AdminController } from './admin.controller';
import { authenticate, requireAdmin } from '../../core/middleware/auth';

import { authLimiter } from '../../core/middleware/rate-limiter';

const router = Router();

// Public routes for admin auth
router.post('/request-otp', authLimiter, AdminController.requestOtp);
router.post('/verify-otp', authLimiter, AdminController.verifyOtp);

// Protected routes (require valid admin session)
router.get('/metrics', authenticate, requireAdmin, AdminController.getMetrics);
router.get('/businesses', authenticate, requireAdmin, AdminController.getBusinesses);
router.post('/businesses/:id/approve', authenticate, requireAdmin, AdminController.approve);
router.post('/businesses/:id/reject', authenticate, requireAdmin, AdminController.reject);
router.post('/businesses/:id/suspend', authenticate, requireAdmin, AdminController.suspend);
router.post('/businesses/:id/reactivate', authenticate, requireAdmin, AdminController.reactivate);
router.delete('/businesses/:id', authenticate, requireAdmin, AdminController.deleteBusiness);

export default router;
