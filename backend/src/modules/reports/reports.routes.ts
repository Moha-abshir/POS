import { Router } from 'express';
import { ReportsController } from './reports.controller';
import { authenticate } from '../../core/middleware/auth';

const router = Router();

// Apply auth middleware to all report endpoints
router.use(authenticate);

router.get('/overview', ReportsController.getOverview);
router.get('/sales', ReportsController.getSales);
router.get('/profit-loss', ReportsController.getProfitLoss);
router.get('/inventory', ReportsController.getInventory);
router.get('/customers', ReportsController.getCustomers);
router.get('/credit', ReportsController.getCredit);
router.get('/suppliers', ReportsController.getSuppliers);
router.get('/mpesa', ReportsController.getMpesa);
router.get('/refunds', ReportsController.getRefunds);
router.get('/damaged-goods', ReportsController.getDamagedGoods);
router.get('/export', ReportsController.exportReport);

export default router;
