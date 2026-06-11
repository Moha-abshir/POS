import { Router } from 'express';
import { AuthController } from './auth.controller';
import { requireAuth } from '../../core/middleware/auth.middleware';

const router = Router();

router.post('/request-otp', AuthController.requestOtp);
router.post('/verify-otp', AuthController.verifyOtp);
router.post('/logout', AuthController.logout);
router.put('/onboarding', requireAuth, AuthController.onboarding);

export default router;
