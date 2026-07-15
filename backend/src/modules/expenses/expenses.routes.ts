import { Router } from 'express';
import { ExpensesController } from './expenses.controller';
import { authenticate, authorize } from '../../core/middleware/auth';

const router = Router();

// Restrict all expense operations to Owner and Manager roles
router.use(authenticate, authorize(['OWNER', 'MANAGER']));

router.get('/', ExpensesController.getExpenses);
router.post('/', ExpensesController.createExpense);
router.delete('/:id', ExpensesController.deleteExpense);

export default router;
