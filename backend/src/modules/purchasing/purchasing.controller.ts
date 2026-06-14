import { Request, Response, NextFunction } from 'express';
import { PurchasingService } from './purchasing.service';
import { createPurchaseSchema } from './purchasing.schema';

export class PurchasingController {
  static async createPurchase(req: Request, res: Response, next: NextFunction) {
    try {
      const data = createPurchaseSchema.parse(req.body);
      const purchase = await PurchasingService.createPurchase(req.user!.businessId, req.user!.id, data);
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

      const result = await PurchasingService.getPurchases(req.user!.businessId, limit, offset);
      res.json({ success: true, data: result.data, meta: result.meta });
    } catch (error) {
      next(error);
    }
  }
}
