import { Router } from 'express';
import { ReportsController } from './reports.controller';
import { authenticate, authorize } from '../../core/middleware/auth';
import { cacheMiddleware } from '../../core/middleware/cache';

const router = Router();

// Apply auth middleware and authorize OWNER role to all report endpoints
router.use(authenticate, authorize(['OWNER']));

router.get('/overview', cacheMiddleware(1800), ReportsController.getOverview);
router.get('/sales', cacheMiddleware(1800), ReportsController.getSales);
router.get('/product-sales', ReportsController.getProductSales);
router.get('/profit-loss', cacheMiddleware(1800), ReportsController.getProfitLoss);
router.get('/inventory', cacheMiddleware(1800), ReportsController.getInventory);
router.get('/customers', cacheMiddleware(1800), ReportsController.getCustomers);
router.get('/credit', cacheMiddleware(1800), ReportsController.getCredit);
router.get('/suppliers', cacheMiddleware(1800), ReportsController.getSuppliers);
router.get('/mpesa', cacheMiddleware(1800), ReportsController.getMpesa);
router.get('/refunds', cacheMiddleware(1800), ReportsController.getRefunds);
router.get('/damaged-goods', cacheMiddleware(1800), ReportsController.getDamagedGoods);
router.get('/export', ReportsController.exportReport);

export default router;
