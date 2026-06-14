import { Request, Response, NextFunction } from 'express';
import { InventoryService } from './inventory.service';
import { adjustStockSchema, recordDamageSchema } from './inventory.schema';

export class InventoryController {
  static async getMovements(req: Request, res: Response, next: NextFunction) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 50;
      const offset = (page - 1) * limit;

      const result = await InventoryService.getStockMovements(req.user!.businessId, limit, offset);
      res.json({ success: true, data: result.data, meta: result.meta });
    } catch (error) {
      next(error);
    }
  }

  static async adjustStock(req: Request, res: Response, next: NextFunction) {
    try {
      const data = adjustStockSchema.parse(req.body);
      await InventoryService.manualAdjustment(req.user!.businessId, req.user!.id, data);
      res.json({ success: true, message: 'Stock adjusted successfully' });
    } catch (error) {
      next(error);
    }
  }

  static async recordDamage(req: Request, res: Response, next: NextFunction) {
    try {
      const data = recordDamageSchema.parse(req.body);
      await InventoryService.recordDamage(req.user!.businessId, req.user!.id, data);
      res.json({ success: true, message: 'Damage recorded successfully' });
    } catch (error) {
      next(error);
    }
  }
}
