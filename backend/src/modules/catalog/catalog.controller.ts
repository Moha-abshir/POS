import { Request, Response } from 'express';
import { CatalogService } from './catalog.service';
import { createCategorySchema, createProductSchema, createProductUnitSchema } from './catalog.schema';

export class CatalogController {
  // Categories
  static async createCategory(req: Request, res: Response) {
    try {
      const data = createCategorySchema.parse(req.body);
      const category = await CatalogService.createCategory(data);
      res.status(201).json({ success: true, data: category });
    } catch (error: any) {
      res.status(400).json({ success: false, error: { message: error.message } });
    }
  }

  static async getCategories(req: Request, res: Response) {
    try {
      const categories = await CatalogService.getCategories();
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
      const product = await CatalogService.createProduct(data, userId);
      res.status(201).json({ success: true, data: product });
    } catch (error: any) {
      res.status(400).json({ success: false, error: { message: error.message } });
    }
  }

  static async getProducts(req: Request, res: Response) {
    try {
      const products = await CatalogService.getProducts();
      res.json({ success: true, data: products });
    } catch (error: any) {
      res.status(500).json({ success: false, error: { message: error.message } });
    }
  }

  static async getProductDetails(req: Request, res: Response) {
    try {
      const id = req.params.id as string;
      const product = await CatalogService.getProductDetails(id);
      res.json({ success: true, data: product });
    } catch (error: any) {
      res.status(404).json({ success: false, error: { message: error.message } });
    }
  }

  // Product Units
  static async createProductUnit(req: Request, res: Response) {
    try {
      const data = createProductUnitSchema.parse(req.body);
      const unit = await CatalogService.createProductUnit(data);
      res.status(201).json({ success: true, data: unit });
    } catch (error: any) {
      res.status(400).json({ success: false, error: { message: error.message } });
    }
  }
}
