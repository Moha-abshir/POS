import { Router } from 'express';
import { PurchasingController } from './purchasing.controller';
import { authenticate } from '../../core/middleware/auth';

const router = Router();

router.use(authenticate);

router.post('/', PurchasingController.createPurchase);
router.get('/', PurchasingController.getPurchases);

export default router;
