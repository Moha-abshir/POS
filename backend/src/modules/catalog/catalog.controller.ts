import { Request, Response, NextFunction } from 'express';
import { CatalogService } from './catalog.service';
import { createCategorySchema, createProductSchema, createProductUnitSchema } from './catalog.schema';

export class CatalogController {
  // Categories
  static async createCategory(req: Request, res: Response, next: NextFunction) {
    try {
      const data = createCategorySchema.parse(req.body);
      const businessId = req.user!.businessId;
      const category = await CatalogService.createCategory(data, businessId);
      res.status(201).json({ success: true, data: category });
    } catch (error) {
      next(error);
    }
  }

  static async getCategories(req: Request, res: Response, next: NextFunction) {
    try {
      const businessId = req.user!.businessId;
      const limit = parseInt(req.query.limit as string) || 50;
      const offset = parseInt(req.query.offset as string) || 0;
      const categories = await CatalogService.getCategories(businessId, limit, offset);
      res.json({ success: true, data: categories });
    } catch (error) {
      next(error);
    }
  }

  // Products
  static async createProduct(req: Request, res: Response, next: NextFunction) {
    try {
      const data = createProductSchema.parse(req.body);
      const userId = req.user!.id; // Available because of authenticate middleware
      const businessId = req.user!.businessId;
      const product = await CatalogService.createProduct(data, businessId, userId);
      res.status(201).json({ success: true, data: product });
    } catch (error) {
      next(error);
    }
  }

  static async getProducts(req: Request, res: Response, next: NextFunction) {
    try {
      const businessId = req.user!.businessId;
      const limit = parseInt(req.query.limit as string) || 50;
      const offset = parseInt(req.query.offset as string) || 0;
      const products = await CatalogService.getProducts(businessId, limit, offset);
      res.json({ success: true, data: products });
    } catch (error) {
      next(error);
    }
  }

  static async getProductDetails(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const businessId = req.user!.businessId;
      const product = await CatalogService.getProductDetails(id, businessId);
      res.json({ success: true, data: product });
    } catch (error) {
      next(error);
    }
  }

  // Product Units
  static async createProductUnit(req: Request, res: Response, next: NextFunction) {
    try {
      const data = createProductUnitSchema.parse(req.body);
      const businessId = req.user!.businessId;
      const unit = await CatalogService.createProductUnit(data, businessId);
      res.status(201).json({ success: true, data: unit });
    } catch (error) {
      next(error);
    }
  }
}
