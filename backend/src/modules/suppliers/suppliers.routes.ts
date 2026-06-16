import { Router } from 'express';
import { SuppliersController } from './suppliers.controller';
import { authenticate, authorize } from '../../core/middleware/auth';

const router = Router();

router.use(authenticate);

router.get('/', authorize(['OWNER', 'MANAGER']), SuppliersController.getSuppliers);
router.post('/', authorize(['OWNER', 'MANAGER']), SuppliersController.createSupplier);
router.get('/:id', authorize(['OWNER', 'MANAGER']), SuppliersController.getSupplierById);
router.put('/:id', authorize(['OWNER', 'MANAGER']), SuppliersController.updateSupplier);
router.post('/:id/payments', authorize(['OWNER', 'MANAGER']), SuppliersController.recordPayment);

export default router;
