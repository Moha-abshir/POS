import { Request, Response, NextFunction } from 'express';
import { SalesService } from './sales.service';

export class SalesController {
  static async getSales(req: Request, res: Response, next: NextFunction) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 50;
      const offset = (page - 1) * limit;
      const customerId = req.query.customerId as string;

      const result = await SalesService.getSales(req.user!.businessId, { limit, offset, customerId });
      res.status(200).json({ status: 'success', message: 'Sales retrieved successfully', ...result });
    } catch (error) {
      next(error);
    }
  }

  static async createSale(req: Request, res: Response, next: NextFunction) {
    try {
      const sale = await SalesService.createSale(req.user!.businessId, req.user!.id, req.body);
      res.status(201).json({ status: 'success', message: 'Sale recorded successfully', data: sale });
    } catch (error) {
      next(error);
    }
  }
}
