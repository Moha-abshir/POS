import { Request, Response, NextFunction } from 'express';
import { SuppliersService } from './suppliers.service';

export class SuppliersController {
  static async getSuppliers(req: Request, res: Response, next: NextFunction) {
    try {
      const search = req.query.search as string;
      const suppliers = await SuppliersService.getSuppliers(req.user!.businessId, search);
      res.json({ success: true, data: suppliers });
    } catch (error) {
      next(error);
    }
  }

  static async getSupplierById(req: Request, res: Response, next: NextFunction) {
    try {
      const supplier = await SuppliersService.getSupplierById(req.user!.businessId, req.params.id as string);
      
      if (!supplier) {
        return res.status(404).json({ success: false, message: 'Supplier not found' });
      }
      
      res.json({ success: true, data: supplier });
    } catch (error) {
      next(error);
    }
  }

  static async createSupplier(req: Request, res: Response, next: NextFunction) {
    try {
      const supplier = await SuppliersService.createSupplier(req.user!.businessId, req.user!.id, req.body);
      res.status(201).json({ success: true, data: supplier });
    } catch (error) {
      next(error);
    }
  }

  static async updateSupplier(req: Request, res: Response, next: NextFunction) {
    try {
      const supplier = await SuppliersService.updateSupplier(req.user!.businessId, req.params.id as string, req.body);
      
      if (!supplier) {
        return res.status(404).json({ success: false, message: 'Supplier not found' });
      }
      res.json({ success: true, data: supplier });
    } catch (error) {
      next(error);
    }
  }
}
