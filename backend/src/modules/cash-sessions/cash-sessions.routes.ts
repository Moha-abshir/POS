import { Router } from 'express';
import { CashSessionsController } from './cash-sessions.controller';
import { authenticate } from '../../core/middleware/auth';
import { cacheMiddleware } from '../../core/middleware/cache';

const router = Router();

router.use(authenticate);

router.get('/active', cacheMiddleware({ ttlSeconds: 120, userScoped: true }), CashSessionsController.getActive);
router.post('/open', CashSessionsController.open);
router.post('/close', CashSessionsController.close);
router.get('/history', CashSessionsController.getHistory);
router.post('/:id/resolve', CashSessionsController.resolveDiscrepancy);

export default router;
