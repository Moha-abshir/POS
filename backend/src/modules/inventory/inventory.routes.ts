import { Router } from 'express';
import { InventoryController } from './inventory.controller';
import { authenticate, authorize } from '../../core/middleware/auth';

const router = Router();

router.use(authenticate);

router.get('/movements', authorize(['OWNER', 'MANAGER']), InventoryController.getMovements);
router.post('/adjust', authorize(['OWNER', 'MANAGER']), InventoryController.adjustStock);
router.get('/damage', authorize(['OWNER', 'MANAGER', 'CASHIER']), InventoryController.getDamages);
router.post('/damage', authorize(['OWNER', 'MANAGER']), InventoryController.recordDamage);

// Restock List routes
router.get('/restock-list', authorize(['OWNER', 'MANAGER', 'CASHIER']), InventoryController.getRestockList);
router.post('/restock-list', authorize(['OWNER', 'MANAGER', 'CASHIER']), InventoryController.addToRestockList);
router.post('/restock-list/clear', authorize(['OWNER', 'MANAGER']), InventoryController.clearOrderedRestockItems);
router.patch('/restock-list/:id', authorize(['OWNER', 'MANAGER', 'CASHIER']), InventoryController.updateRestockItem);

export default router;
