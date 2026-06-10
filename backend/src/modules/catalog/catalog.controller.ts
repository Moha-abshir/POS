import { Request, Response } from 'express';
import { CatalogService } from './catalog.service';
import { createCategorySchema, createProductSchema, createProductUnitSchema } from './catalog.schema';

export class CatalogController {
  // Categories
  static async createCategory(req: Request, res: Response) {
    try {
      const data = createCategorySchema.parse(req.body);
      const businessId = req.user!.businessId;
      const category = await CatalogService.createCategory(data, businessId);
      res.status(201).json({ success: true, data: category });
    } catch (error: any) {
      res.status(400).json({ success: false, error: { message: error.message } });
    }
  }

  static async getCategories(req: Request, res: Response) {
    try {
      const businessId = req.user!.businessId;
      const categories = await CatalogService.getCategories(businessId);
      res.json({ success: true, data: categories });
    } catch (error: any) {
      res.status(500).json({ success: false, error: { message: error.message } });
    }
  }

  // Products
  static async createProduct(req: Request, res: Response) {
    try {
      const data = createProductSchema.parse(req.body);
      const userId = req.user!.id; // Available because of authenticate middleware
      const businessId = req.user!.businessId;
      const product = await CatalogService.createProduct(data, businessId, userId);
      res.status(201).json({ success: true, data: product });
    } catch (error: any) {
      res.status(400).json({ success: false, error: { message: error.message } });
    }
  }

  static async getProducts(req: Request, res: Response) {
    try {
      const businessId = req.user!.businessId;
      const products = await CatalogService.getProducts(businessId);
      res.json({ success: true, data: products });
    } catch (error: any) {
      res.status(500).json({ success: false, error: { message: error.message } });
    }
  }

  static async getProductDetails(req: Request, res: Response) {
    try {
      const id = req.params.id as string;
      const businessId = req.user!.businessId;
      const product = await CatalogService.getProductDetails(id, businessId);
      res.json({ success: true, data: product });
    } catch (error: any) {
      res.status(404).json({ success: false, error: { message: error.message } });
    }
  }

  // Product Units
  static async createProductUnit(req: Request, res: Response) {
    try {
      const data = createProductUnitSchema.parse(req.body);
      const businessId = req.user!.businessId;
      const unit = await CatalogService.createProductUnit(data, businessId);
      res.status(201).json({ success: true, data: unit });
    } catch (error: any) {
      res.status(400).json({ success: false, error: { message: error.message } });
    }
  }
}
