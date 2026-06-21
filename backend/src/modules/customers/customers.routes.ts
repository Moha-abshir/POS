import { Router } from 'express';
import { CustomersController } from './customers.controller';
import { authenticate } from '../../core/middleware/auth';

const router = Router();

router.use(authenticate);

router.get('/', CustomersController.getCustomers);
router.post('/', CustomersController.createCustomer);
router.patch('/:id', CustomersController.updateCustomer);
router.get('/:id/purchases', CustomersController.getCustomerPurchases);
router.post('/:id/payments', CustomersController.recordPayment);
router.get('/:id/payments', CustomersController.getCustomerPayments);

export default router;
