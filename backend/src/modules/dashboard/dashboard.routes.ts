import { Router } from 'express';
import { DashboardController } from './dashboard.controller';
import { authenticate } from '../../core/middleware/auth';

const router = Router();

router.use(authenticate);

router.get('/summary', DashboardController.getSummary);

export default router;
