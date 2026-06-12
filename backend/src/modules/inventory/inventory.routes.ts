import { Router } from 'express';
import { InventoryController } from './inventory.controller';
import { authenticate } from '../../core/middleware/auth';

const router = Router();

router.use(authenticate);

router.get('/movements', InventoryController.getMovements);
router.post('/adjust', InventoryController.adjustStock);
router.post('/damage', InventoryController.recordDamage);

export default router;
