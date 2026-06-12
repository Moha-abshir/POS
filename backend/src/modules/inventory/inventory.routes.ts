import { Router } from 'express';
import { InventoryController } from './inventory.controller';
import { authenticate, authorize } from '../../core/middleware/auth';

const router = Router();

router.use(authenticate);

router.get('/movements', authorize(['OWNER', 'MANAGER']), InventoryController.getMovements);
router.post('/adjust', authorize(['OWNER', 'MANAGER']), InventoryController.adjustStock);
router.post('/damage', authorize(['OWNER', 'MANAGER']), InventoryController.recordDamage);

export default router;
