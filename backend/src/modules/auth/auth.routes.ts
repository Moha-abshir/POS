import { Router } from 'express';
import { AuthController } from './auth.controller';
import { authenticate } from '../../core/middleware/auth';
import { authLimiter } from '../../core/middleware/rate-limiter';

const router = Router();

router.post('/request-otp', authLimiter, AuthController.requestOtp);
router.post('/verify-otp', authLimiter, AuthController.verifyOtp);
router.post('/refresh', AuthController.refresh);
router.post('/logout', authenticate, AuthController.logout);
router.put('/onboarding', authenticate, AuthController.onboarding);
router.put('/business/settings', authenticate, AuthController.updateBusinessSettings);
router.get('/me', authenticate, AuthController.me);

export default router;
