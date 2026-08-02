import { Request, Response, NextFunction } from 'express';
import { BankingService } from './banking.service';
import { AppError } from '../../core/utils/AppError';

export class BankingController {
  static async getCustomers(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await BankingService.getCustomers(req.user!.businessId);
      res.json({ status: 'success', data });
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

  static async updateCustomer(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const customer = await BankingService.updateCustomer(req.user!.businessId, id, req.body);
      res.json({ status: 'success', data: customer });
    } catch (error) {
      next(error);
    }
  }

  static async deleteCustomer(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const result = await BankingService.deleteCustomer(req.user!.businessId, id);
      res.json({ status: 'success', data: result });
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
      if (!['DEPOSIT', 'WITHDRAWAL'].includes(type)) {
        throw new AppError('Invalid transaction type. Must be DEPOSIT or WITHDRAWAL', 400);
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
          code: row[headers.indexOf('code')] || (row.length > 0 ? row[0] : null),
          name: row[headers.indexOf('name')] || (row.length > 1 ? row[1] : row[0]),
          phone: row[headers.indexOf('phone')] || (row.length > 2 ? row[2] : null),
          idNumber: row[headers.indexOf('idnumber')] || row[headers.indexOf('id_number')] || (row.length > 3 ? row[3] : null),
          balance: row[headers.indexOf('balance')] || (row.length > 4 ? row[4] : '0')
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
