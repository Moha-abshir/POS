import { Router } from 'express';
import { AuthController } from './auth.controller';

const router = Router();

router.post('/request-otp', AuthController.requestOtp);
router.post('/verify-otp', AuthController.verifyOtp);
router.post('/logout', AuthController.logout);

export default router;
