import { Router } from 'express';
import { ExportController } from './export.controller';
import { authenticate, authorize } from '../../core/middleware/auth';

const router = Router();

router.use(authenticate, authorize(['OWNER', 'MANAGER', 'CASHIER']));

router.get('/products', ExportController.exportProducts);
router.get('/customers', ExportController.exportCustomers);
router.get('/suppliers', ExportController.exportSuppliers);

export default router;
