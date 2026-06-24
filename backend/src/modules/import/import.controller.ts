import { Request, Response, NextFunction } from 'express';
import { ImportService } from './import.service';

export class ImportController {
  static async importProducts(req: Request, res: Response, next: NextFunction) {
    try {
      const { csvText } = req.body;
      if (!csvText) {
        return res.status(400).json({ success: false, message: 'Missing csvText field in body' });
      }

      const businessId = req.user!.businessId;
      const userId = req.user!.id;

      const result = await ImportService.importProducts(businessId, userId, csvText);
      res.status(200).json({ success: true, ...result });
    } catch (error: any) {
      next(error);
    }
  }

  static async importCustomers(req: Request, res: Response, next: NextFunction) {
    try {
      const { csvText } = req.body;
      if (!csvText) {
        return res.status(400).json({ success: false, message: 'Missing csvText field in body' });
      }

      const businessId = req.user!.businessId;
      const userId = req.user!.id;

      const result = await ImportService.importCustomers(businessId, userId, csvText);
      res.status(200).json({ success: true, ...result });
    } catch (error: any) {
      next(error);
    }
  }

  static async importSuppliers(req: Request, res: Response, next: NextFunction) {
    try {
      const { csvText } = req.body;
      if (!csvText) {
        return res.status(400).json({ success: false, message: 'Missing csvText field in body' });
      }

      const businessId = req.user!.businessId;
      const userId = req.user!.id;

      const result = await ImportService.importSuppliers(businessId, userId, csvText);
      res.status(200).json({ success: true, ...result });
    } catch (error: any) {
      next(error);
    }
  }
}
