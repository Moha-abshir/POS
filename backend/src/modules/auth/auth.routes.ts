import { Router } from 'express';
import { AuthController } from './auth.controller';
import { authenticate } from '../../core/middleware/auth';

const router = Router();

router.post('/request-otp', AuthController.requestOtp);
router.post('/verify-otp', AuthController.verifyOtp);
router.post('/logout', AuthController.logout);
router.put('/onboarding', authenticate, AuthController.onboarding);

export default router;
