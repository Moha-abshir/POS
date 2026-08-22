import { Request, Response, NextFunction } from 'express';
import { CustomersService } from './customers.service';
import { flushPattern } from '../../core/cache/redis';

export class CustomersController {
  static async getCustomers(req: Request, res: Response, next: NextFunction) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 1000;
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
      await flushPattern(`cache:${req.user!.businessId}:/api/customers*`);
      res.status(201).json({ status: 'success', message: 'Customer created successfully', data: customer });
    } catch (error) {
      next(error);
    }
  }

  static async updateCustomer(req: Request, res: Response, next: NextFunction) {
    try {
      const customer = await CustomersService.updateCustomer(req.user!.businessId, req.params.id as string, req.body);
      await flushPattern(`cache:${req.user!.businessId}:/api/customers*`);
      res.status(200).json({ status: 'success', message: 'Customer updated successfully', data: customer });
    } catch (error) {
      next(error);
    }
  }

  static async deleteCustomer(req: Request, res: Response, next: NextFunction) {
    try {
      await CustomersService.deleteCustomer(req.user!.businessId, req.params.id as string);
      await flushPattern(`cache:${req.user!.businessId}:/api/customers*`);
      res.status(200).json({ status: 'success', message: 'Customer deleted successfully' });
    } catch (error) {
      next(error);
    }
  }

  static async clearAllCustomers(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await CustomersService.clearAllCustomers(req.user!.businessId);
      await flushPattern(`cache:${req.user!.businessId}:/api/customers*`);
      res.status(200).json({ status: 'success', message: `${result.count} customers cleared successfully`, data: result });
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

  static async recordPayment(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await CustomersService.recordPayment(
        req.user!.businessId,
        req.user!.id,
        req.params.id as string,
        req.body
      );
      await flushPattern(`cache:${req.user!.businessId}:/api/customers*`);
      res.status(200).json({ status: 'success', message: 'Payment recorded successfully', data: result });
    } catch (error) {
      next(error);
    }
  }

  static async getCustomerPayments(req: Request, res: Response, next: NextFunction) {
    try {
      const payments = await CustomersService.getCustomerPayments(req.user!.businessId, req.params.id as string);
      res.status(200).json({ status: 'success', message: 'Customer payments retrieved successfully', data: payments });
    } catch (error) {
      next(error);
    }
  }

  static async reversePayment(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await CustomersService.reversePayment(
        req.user!.businessId,
        req.user!.id,
        req.params.id as string,
        req.params.paymentId as string
      );
      await flushPattern(`cache:${req.user!.businessId}:/api/customers*`);
      res.status(200).json({ status: 'success', message: 'Payment reversed successfully', data: result });
    } catch (error) {
      next(error);
    }
  }

  static async recordEmployeePayout(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await CustomersService.recordEmployeePayout(
        req.user!.businessId,
        req.user!.id,
        req.params.id as string,
        req.body
      );
      await flushPattern(`cache:${req.user!.businessId}:/api/customers*`);
      res.status(200).json({ status: 'success', message: 'Employee payout recorded successfully', data: result });
    } catch (error) {
      next(error);
    }
  }

  static async recordEmployeeDeposit(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await CustomersService.recordEmployeeDeposit(
        req.user!.businessId,
        req.user!.id,
        req.params.id as string,
        req.body
      );
      await flushPattern(`cache:${req.user!.businessId}:/api/customers*`);
      res.status(200).json({ status: 'success', message: 'Employee deposit recorded successfully', data: result });
    } catch (error) {
      next(error);
    }
  }
}

