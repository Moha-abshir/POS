import { Router } from 'express';
import { PurchasingController } from './purchasing.controller';
import { authenticate, authorize } from '../../core/middleware/auth';

const router = Router();

router.use(authenticate);

router.post('/', authorize(['OWNER', 'MANAGER']), PurchasingController.createPurchase);
router.get('/', authorize(['OWNER', 'MANAGER', 'CASHIER']), PurchasingController.getPurchases);

export default router;
