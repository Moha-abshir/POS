import { Request, Response, NextFunction } from 'express';
import { InventoryService } from './inventory.service';

export class InventoryController {
  static async getMovements(req: Request, res: Response, next: NextFunction) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 50;
      const offset = (page - 1) * limit;

      const movements = await InventoryService.getStockMovements(req.user!.businessId, limit, offset);
      res.json({ success: true, data: movements });
    } catch (error) {
      next(error);
    }
  }

  static async adjustStock(req: Request, res: Response, next: NextFunction) {
    try {
      await InventoryService.manualAdjustment(req.user!.businessId, req.user!.id, req.body);
      res.json({ success: true, message: 'Stock adjusted successfully' });
    } catch (error) {
      next(error);
    }
  }

  static async recordDamage(req: Request, res: Response, next: NextFunction) {
    try {
      await InventoryService.recordDamage(req.user!.businessId, req.user!.id, req.body);
      res.json({ success: true, message: 'Damage recorded successfully' });
    } catch (error) {
      next(error);
    }
  }
}
