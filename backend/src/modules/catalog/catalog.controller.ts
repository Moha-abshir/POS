import { Request, Response, NextFunction } from 'express';
import { CatalogService } from './catalog.service';
import { createCategorySchema, createProductSchema, updateProductSchema, updateVariantSchema, createVariantUnitSchema, updateVariantUnitSchema } from './catalog.schema';

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
      const result = await CatalogService.getCategories(businessId, limit, offset);
      res.json({ success: true, data: result.data, meta: result.meta });
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
      let isActive: boolean | undefined = undefined;
      if (req.query.isActive !== undefined) {
        isActive = req.query.isActive === 'true';
      }
      const result = await CatalogService.getProducts(businessId, limit, offset, isActive);
      res.json({ success: true, data: result.data, meta: result.meta });
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

  static async updateProduct(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const data = updateProductSchema.parse(req.body);
      const businessId = req.user!.businessId;
      const product = await CatalogService.updateProduct(id, data, businessId);
      res.json({ success: true, data: product });
    } catch (error) {
      next(error);
    }
  }

  static async updateVariant(req: Request, res: Response, next: NextFunction) {
    try {
      const variantId = req.params.variantId as string;
      const data = updateVariantSchema.parse(req.body);
      const businessId = req.user!.businessId;
      const variant = await CatalogService.updateVariant(variantId, data, businessId);
      res.json({ success: true, data: variant });
    } catch (error) {
      next(error);
    }
  }

  static async createVariantUnit(req: Request, res: Response, next: NextFunction) {
    try {
      const data = createVariantUnitSchema.parse({
        ...req.body,
        variantId: req.params.variantId,
      });
      const businessId = req.user!.businessId;
      const unit = await CatalogService.createVariantUnit(data, businessId);
      res.status(201).json({ success: true, data: unit });
    } catch (error) {
      next(error);
    }
  }

  static async updateVariantUnit(req: Request, res: Response, next: NextFunction) {
    try {
      const variantId = req.params.variantId as string;
      const unitId = req.params.unitId as string;
      const data = updateVariantUnitSchema.parse(req.body);
      const businessId = req.user!.businessId;
      const unit = await CatalogService.updateVariantUnit(unitId, variantId, data, businessId);
      res.json({ success: true, data: unit });
    } catch (error) {
      next(error);
    }
  }
}
