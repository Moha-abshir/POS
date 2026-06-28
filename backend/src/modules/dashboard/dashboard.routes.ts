import { Router } from 'express';
import { DashboardController } from './dashboard.controller';
import { authenticate } from '../../core/middleware/auth';
import { cacheMiddleware } from '../../core/middleware/cache';

const router = Router();

router.use(authenticate);

router.get('/summary', cacheMiddleware(300), DashboardController.getSummary); // 5 minutes cache

export default router;
