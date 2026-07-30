import { Router } from 'express';
import { BankingController } from './banking.controller';
import { authenticate, authorize } from '../../core/middleware/auth';

const router = Router();

router.use(authenticate, authorize(['OWNER']));

router.get('/customers', BankingController.getCustomers);
router.post('/customers', BankingController.createCustomer);
router.post('/customers/import', BankingController.importCustomers);
router.get('/customers/:id/ledger', BankingController.getLedger);
router.post('/customers/:id/transactions', BankingController.processTransaction);

export default router;
