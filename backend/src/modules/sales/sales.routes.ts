import { Router } from 'express';
import { SalesController } from './sales.controller';
import { authenticate } from '../../core/middleware/auth';

const router = Router();

router.use(authenticate);

router.get('/', SalesController.getSales);
router.get('/:id', SalesController.getSaleDetails);
router.post('/', SalesController.createSale);

export default router;
