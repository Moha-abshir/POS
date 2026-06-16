import { Request, Response, NextFunction } from 'express';
import { InventoryService } from './inventory.service';
import { adjustStockSchema, recordDamageSchema, addToRestockSchema, updateRestockSchema } from './inventory.schema';
import { RestockService } from './restock.service';

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

  static async getRestockList(req: Request, res: Response, next: NextFunction) {
    try {
      const items = await RestockService.getRestockItems(req.user!.businessId);
      res.json({ success: true, data: items });
    } catch (error) {
      next(error);
    }
  }

  static async addToRestockList(req: Request, res: Response, next: NextFunction) {
    try {
      const { variantId } = addToRestockSchema.parse(req.body);
      const item = await RestockService.addToRestockList(req.user!.businessId, req.user!.id, variantId);
      res.status(201).json({ success: true, data: item });
    } catch (error) {
      next(error);
    }
  }

  static async updateRestockItem(req: Request, res: Response, next: NextFunction) {
    try {
      const { isOrdered } = updateRestockSchema.parse(req.body);
      const item = await RestockService.updateRestockItem(req.user!.businessId, req.params.id as string, isOrdered);
      res.json({ success: true, data: item });
    } catch (error) {
      next(error);
    }
  }

  static async clearOrderedRestockItems(req: Request, res: Response, next: NextFunction) {
    try {
      await RestockService.clearOrderedItems(req.user!.businessId);
      res.json({ success: true, message: 'Ordered items cleared' });
    } catch (error) {
      next(error);
    }
  }
}
