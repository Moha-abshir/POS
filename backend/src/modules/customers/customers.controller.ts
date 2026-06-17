import { Request, Response, NextFunction } from 'express';
import { CustomersService } from './customers.service';

export class CustomersController {
  static async getCustomers(req: Request, res: Response, next: NextFunction) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 50;
      const offset = (page - 1) * limit;
      const search = req.query.search as string;

      const result = await CustomersService.getCustomers(req.user!.businessId, { limit, offset, search });
      res.status(200).json({ status: 'success', message: 'Customers retrieved successfully', ...result });
    } catch (error) {
      next(error);
    }
  }

  static async createCustomer(req: Request, res: Response, next: NextFunction) {
    try {
      const customer = await CustomersService.createCustomer(req.user!.businessId, req.user!.id, req.body);
      res.status(201).json({ status: 'success', message: 'Customer created successfully', data: customer });
    } catch (error) {
      next(error);
    }
  }

  static async updateCustomer(req: Request, res: Response, next: NextFunction) {
    try {
      const customer = await CustomersService.updateCustomer(req.user!.businessId, req.params.id as string, req.body);
      res.status(200).json({ status: 'success', message: 'Customer updated successfully', data: customer });
    } catch (error) {
      next(error);
    }
  }

  static async getCustomerPurchases(req: Request, res: Response, next: NextFunction) {
    try {
      const purchases = await CustomersService.getCustomerPurchases(req.user!.businessId, req.params.id as string);
      res.status(200).json({ status: 'success', message: 'Customer purchases retrieved successfully', data: purchases });
    } catch (error) {
      next(error);
    }
  }
}
