import { Request, Response, NextFunction } from 'express';
import { SuppliersService } from './suppliers.service';
import { createSupplierSchema, updateSupplierSchema } from './suppliers.schema';

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
      const data = createSupplierSchema.parse(req.body);
      const supplier = await SuppliersService.createSupplier(req.user!.businessId, req.user!.id, data);
      res.status(201).json({ success: true, data: supplier });
    } catch (error) {
      next(error);
    }
  }

  static async updateSupplier(req: Request, res: Response, next: NextFunction) {
    try {
      const data = updateSupplierSchema.parse(req.body);
      const supplier = await SuppliersService.updateSupplier(req.user!.businessId, req.params.id as string, data);
      
      if (!supplier) {
        return res.status(404).json({ success: false, message: 'Supplier not found' });
      }
      res.json({ success: true, data: supplier });
    } catch (error) {
      next(error);
    }
  }

  static async recordPayment(req: Request, res: Response, next: NextFunction) {
    try {
      const supplierId = req.params.id as string;
      const { amount, method, mpesaReceiptNumber } = req.body;
      
      const result = await SuppliersService.recordPayment(
        req.user!.businessId, 
        req.user!.id, 
        supplierId, 
        { amount: Number(amount), method, mpesaReceiptNumber }
      );
      
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  static async getSupplierPayments(req: Request, res: Response, next: NextFunction) {
    try {
      const payments = await SuppliersService.getSupplierPayments(req.user!.businessId, req.params.id as string);
      res.json({ success: true, data: payments });
    } catch (error) {
      next(error);
    }
  }

  static async getSupplierPurchases(req: Request, res: Response, next: NextFunction) {
    try {
      const purchases = await SuppliersService.getSupplierPurchases(req.user!.businessId, req.params.id as string);
      res.json({ success: true, data: purchases });
    } catch (error) {
      next(error);
    }
  }
}
