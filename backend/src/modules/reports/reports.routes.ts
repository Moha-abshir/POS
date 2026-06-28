import { Router } from 'express';
import { ReportsController } from './reports.controller';
import { authenticate, authorize } from '../../core/middleware/auth';
import { cacheMiddleware } from '../../core/middleware/cache';

const router = Router();

// Apply auth middleware and authorize OWNER role to all report endpoints
router.use(authenticate, authorize(['OWNER']));

router.get('/overview', cacheMiddleware(3600), ReportsController.getOverview);
router.get('/sales', cacheMiddleware(3600), ReportsController.getSales);
router.get('/profit-loss', cacheMiddleware(3600), ReportsController.getProfitLoss);
router.get('/inventory', cacheMiddleware(3600), ReportsController.getInventory);
router.get('/customers', cacheMiddleware(3600), ReportsController.getCustomers);
router.get('/credit', cacheMiddleware(3600), ReportsController.getCredit);
router.get('/suppliers', cacheMiddleware(3600), ReportsController.getSuppliers);
router.get('/mpesa', cacheMiddleware(3600), ReportsController.getMpesa);
router.get('/refunds', cacheMiddleware(3600), ReportsController.getRefunds);
router.get('/damaged-goods', cacheMiddleware(3600), ReportsController.getDamagedGoods);
router.get('/export', ReportsController.exportReport);

export default router;
