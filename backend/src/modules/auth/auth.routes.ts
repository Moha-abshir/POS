import { Router } from 'express';
import { AuthController } from './auth.controller';
import { authenticate } from '../../core/middleware/auth';
import rateLimit from 'express-rate-limit';

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit each IP to 10 requests per windowMs
  message: { success: false, message: 'Too many requests, please try again later.' }
});

const router = Router();

router.post('/request-otp', authLimiter, AuthController.requestOtp);
router.post('/verify-otp', authLimiter, AuthController.verifyOtp);
router.post('/refresh', AuthController.refresh);
router.post('/logout', authenticate, AuthController.logout);
router.put('/onboarding', authenticate, AuthController.onboarding);
router.get('/me', authenticate, AuthController.me);

export default router;
