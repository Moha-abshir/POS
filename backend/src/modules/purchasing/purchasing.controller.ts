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

      const filters = {
        startDate: req.query.startDate as string,
        endDate: req.query.endDate as string,
        supplier: req.query.supplier as string,
        invoiceRef: req.query.invoiceRef as string,
        mpesaRef: req.query.mpesaRef as string,
        paymentMethod: req.query.paymentMethod as 'CASH' | 'MPESA' | undefined,
      };

      const result = await PurchasingService.getPurchases(req.user!.businessId, filters, limit, offset);
      res.json({ success: true, data: result.data, meta: result.meta });
    } catch (error) {
      next(error);
    }
  }

  static async getPurchaseDetails(req: Request, res: Response, next: NextFunction) {
    try {
      const purchaseId = req.params.id as string;
      const purchase = await PurchasingService.getPurchaseDetails(req.user!.businessId, purchaseId);
      res.json({ success: true, data: purchase });
    } catch (error) {
      next(error);
    }
  }
}
