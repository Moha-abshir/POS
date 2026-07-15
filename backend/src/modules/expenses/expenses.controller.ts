import { Request, Response, NextFunction } from 'express';
import { ExpensesService } from './expenses.service';

export class ExpensesController {
  static async getExpenses(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await ExpensesService.getExpenses(req.user!.businessId);
      res.status(200).json({ status: 'success', data });
    } catch (error) {
      next(error);
    }
  }

  static async createExpense(req: Request, res: Response, next: NextFunction) {
    try {
      const { category, amount, description, expenseDate } = req.body;

      if (!category || typeof category !== 'string' || !category.trim()) {
        return res.status(400).json({ status: 'error', message: 'Category is required' });
      }

      if (amount === undefined || isNaN(Number(amount)) || Number(amount) <= 0) {
        return res.status(400).json({ status: 'error', message: 'A valid amount greater than 0 is required' });
      }

      const data = await ExpensesService.createExpense(
        req.user!.businessId,
        req.user!.id,
        {
          category: category.trim(),
          amount: Number(amount),
          description,
          expenseDate,
        }
      );

      res.status(201).json({ status: 'success', data });
    } catch (error) {
      next(error);
    }
  }

  static async deleteExpense(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const data = await ExpensesService.deleteExpense(req.user!.businessId, id);

      if (!data) {
        return res.status(404).json({ status: 'error', message: 'Expense not found' });
      }

      res.status(200).json({ status: 'success', message: 'Expense deleted successfully' });
    } catch (error) {
      next(error);
    }
  }
}
