import { Request, Response, NextFunction } from 'express';
import { BankingService } from './banking.service';
import { AppError } from '../../core/utils/AppError';

export class BankingController {
  static async getCustomers(req: Request, res: Response, next: NextFunction) {
    try {
      const type = req.query.type as 'BANKER' | 'LOAN_CLIENT' | undefined;
      const customers = await BankingService.getCustomers(req.user!.businessId, type);
      res.json({ status: 'success', data: customers });
    } catch (error) {
      next(error);
    }
  }

  static async createCustomer(req: Request, res: Response, next: NextFunction) {
    try {
      const customer = await BankingService.createCustomer(req.user!.businessId, req.body);
      res.status(201).json({ status: 'success', data: customer });
    } catch (error) {
      next(error);
    }
  }

  static async getLedger(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const ledger = await BankingService.getLedger(req.user!.businessId, id);
      res.json({ status: 'success', data: ledger });
    } catch (error) {
      next(error);
    }
  }

  static async processTransaction(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const { type, amount, notes } = req.body;
      if (!['DEPOSIT', 'WITHDRAWAL', 'LOAN_ISSUED', 'LOAN_REPAYMENT'].includes(type)) {
        throw new AppError('Invalid transaction type', 400);
      }
      
      const result = await BankingService.processTransaction(req.user!.businessId, req.user!.id, {
        customerId: id,
        type,
        amount: Number(amount),
        notes
      });

      
      res.json({ status: 'success', data: result });
    } catch (error) {
      next(error);
    }
  }

  static async importCustomers(req: Request, res: Response, next: NextFunction) {
    try {
      const { csvText } = req.body;
      if (!csvText) {
        throw new AppError('Missing csvText field', 400);
      }
      
      const rows = csvText.split('\n').map((row: string) => row.split(',').map(c => c.trim().replace(/^"|"$/g, '')));
      if (rows.length < 2) {
        throw new AppError('Invalid CSV format or empty data', 400);
      }
      
      const headers = rows[0].map((h: string) => h.toLowerCase());
      const customers = [];
      
      for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        if (row.length < 2 || !row[0]) continue;
        
        const customer = {
          name: row[headers.indexOf('name')] || row[0],
          phone: row[headers.indexOf('phone')] || (row.length > 1 ? row[1] : null),
          type: (row[headers.indexOf('type')] || row[2] || 'BANKER').toUpperCase(),
          balance: row[headers.indexOf('balance')] || row[3] || '0'
        };
        customers.push(customer);
      }

      const result = await BankingService.importCustomers(req.user!.businessId, customers);
      res.json({ status: 'success', data: result });
    } catch (error) {
      next(error);
    }
  }
}
