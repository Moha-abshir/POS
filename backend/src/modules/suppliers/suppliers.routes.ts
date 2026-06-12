import { Router } from 'express';
import { SuppliersController } from './suppliers.controller';
import { authenticate } from '../../core/middleware/auth';

const router = Router();

router.use(authenticate);

router.get('/', SuppliersController.getSuppliers);
router.post('/', SuppliersController.createSupplier);
router.get('/:id', SuppliersController.getSupplierById);
router.put('/:id', SuppliersController.updateSupplier);

export default router;
