import { Request, Response, NextFunction } from 'express';
import { SalesService } from './sales.service';
import { CashSessionsService } from '../cash-sessions/cash-sessions.service';
import { flushPattern } from '../../core/cache/redis';

export class SalesController {
  static async getSales(req: Request, res: Response, next: NextFunction) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 50;
      const offset = (page - 1) * limit;
      const customerId = req.query.customerId as string;
      const search = req.query.search as string;
      const startDate = req.query.startDate as string;
      const endDate = req.query.endDate as string;
      const paymentStatus = req.query.paymentStatus as 'PAID' | 'PARTIAL' | 'UNPAID';
      const paymentMethod = req.query.paymentMethod as 'CASH' | 'MPESA';
      const mpesaRef = req.query.mpesaRef as string;

      const result = await SalesService.getSales(req.user!.businessId, { limit, offset, customerId, search, startDate, endDate, paymentStatus, paymentMethod, mpesaRef });
      res.status(200).json({ status: 'success', message: 'Sales retrieved successfully', ...result });
    } catch (error) {
      next(error);
    }
  }

  static async createSale(req: Request, res: Response, next: NextFunction) {
    try {
      const activeSession = await CashSessionsService.getActiveSession(req.user!.businessId, req.user!.id);
      if (!activeSession) {
        return res.status(400).json({ 
          status: 'error', 
          message: 'Checkout is blocked. Please open the cash register session (input an opening float) before processing sales.' 
        });
      }

      const sale = await SalesService.createSale(req.user!.businessId, req.user!.id, req.body);
      await flushPattern(`cache:${req.user!.businessId}:*cash-sessions*`);
      if (req.body.customerId) {
        await flushPattern(`cache:${req.user!.businessId}:*customers*`);
      }
      res.status(201).json({ status: 'success', message: 'Sale recorded successfully', data: sale });
    } catch (error) {
      next(error);
    }
  }

  static async getSaleDetails(req: Request, res: Response, next: NextFunction) {
    try {
      const saleId = req.params.id as string;
      const sale = await SalesService.getSaleDetails(req.user!.businessId, saleId);
      
      if (!sale) {
        return res.status(404).json({ status: 'error', message: 'Sale not found' });
      }

      res.status(200).json({ status: 'success', message: 'Sale details retrieved successfully', data: sale });
    } catch (error) {
      next(error);
    }
  }

  static async refundSale(req: Request, res: Response, next: NextFunction) {
    try {
      const activeSession = await CashSessionsService.getActiveSession(req.user!.businessId, req.user!.id);
      if (!activeSession) {
        return res.status(400).json({ 
          status: 'error', 
          message: 'Refund blocked. Please open the cash register session before processing refunds.' 
        });
      }

      const saleId = req.params.id as string;
      const refund = await SalesService.refundSale(
        req.user!.businessId,
        req.user!.id,
        saleId,
        req.body
      );
      await flushPattern(`cache:${req.user!.businessId}:*customers*`);
      res.status(201).json({ status: 'success', message: 'Refund processed successfully', data: refund });
    } catch (error) {
      next(error);
    }
  }
}
