import { Request, Response, NextFunction } from 'express';
import { PurchasingService } from './purchasing.service';

export class PurchasingController {
  static async createPurchase(req: Request, res: Response, next: NextFunction) {
    try {
      const purchase = await PurchasingService.createPurchase(req.user!.businessId, req.user!.id, req.body);
      res.status(201).json({ success: true, data: purchase });
    } catch (error) {
      next(error);
    }
  }

  static async getPurchases(req: Request, res: Response, next: NextFunction) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 50;
      const offset = (page - 1) * limit;

      const purchases = await PurchasingService.getPurchases(req.user!.businessId, limit, offset);
      res.json({ success: true, data: purchases });
    } catch (error) {
      next(error);
    }
  }
}
