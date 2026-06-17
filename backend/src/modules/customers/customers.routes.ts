import { Router } from 'express';
import { CustomersController } from './customers.controller';
import { authenticate } from '../../core/middleware/auth';

const router = Router();

router.use(authenticate);

router.get('/', CustomersController.getCustomers);
router.post('/', CustomersController.createCustomer);
router.patch('/:id', CustomersController.updateCustomer);
router.get('/:id/purchases', CustomersController.getCustomerPurchases);

export default router;
