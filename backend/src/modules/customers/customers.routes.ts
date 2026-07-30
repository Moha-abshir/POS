import { Router } from 'express';
import { CustomersController } from './customers.controller';
import { authenticate, authorize } from '../../core/middleware/auth';

import { cacheMiddleware } from '../../core/middleware/cache';

const router = Router();

router.use(authenticate, authorize(['OWNER']));

router.get('/', cacheMiddleware(300), CustomersController.getCustomers);
router.post('/', CustomersController.createCustomer);
router.patch('/:id', CustomersController.updateCustomer);
router.delete('/clear-all', CustomersController.clearAllCustomers);
router.delete('/:id', CustomersController.deleteCustomer);
router.get('/:id/purchases', cacheMiddleware(300), CustomersController.getCustomerPurchases);
router.post('/:id/payments', CustomersController.recordPayment);
router.get('/:id/payments', cacheMiddleware(300), CustomersController.getCustomerPayments);


export default router;
