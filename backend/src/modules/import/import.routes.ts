import { Router } from 'express';
import { ImportController } from './import.controller';
import { authenticate, authorize } from '../../core/middleware/auth';

const router = Router();

router.use(authenticate, authorize(['OWNER', 'MANAGER']));

router.post('/products', ImportController.importProducts);
router.post('/customers', ImportController.importCustomers);
router.post('/suppliers', ImportController.importSuppliers);

export default router;
