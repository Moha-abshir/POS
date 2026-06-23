import { Router } from 'express';
import { CashSessionsController } from './cash-sessions.controller';
import { authenticate } from '../../core/middleware/auth';

const router = Router();

router.use(authenticate);

router.get('/active', CashSessionsController.getActive);
router.post('/open', CashSessionsController.open);
router.post('/close', CashSessionsController.close);
router.get('/history', CashSessionsController.getHistory);

export default router;
