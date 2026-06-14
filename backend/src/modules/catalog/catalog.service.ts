import { eq, and } from 'drizzle-orm';
import { db } from '../../db';
import { AppError } from '../../core/utils/AppError';
import { categories, products, productUnits } from '../../db/schema';
import { CreateCategoryInput, CreateProductInput, CreateProductUnitInput } from './catalog.schema';

export class CatalogService {
  // --- CATEGORIES ---
  static async createCategory(data: CreateCategoryInput, businessId: string) {
    const [category] = await db.insert(categories).values({
      ...data,
      businessId,
    }).returning();
    return category;
  }

  static async getCategories(businessId: string, limit = 50, offset = 0) {
    return db.select()
      .from(categories)
      .where(eq(categories.businessId, businessId))
      .orderBy(categories.name)
      .limit(limit)
      .offset(offset);
  }

  // --- PRODUCTS ---
  static async createProduct(data: CreateProductInput, businessId: string, userId: string) {
    // Cross-tenant validation: ensure category belongs to business
    if (data.categoryId) {
      const [category] = await db.select().from(categories).where(and(eq(categories.id, data.categoryId), eq(categories.businessId, businessId)));
      if (!category) throw new AppError('Category not found or does not belong to this business', 400);
    }

    const [product] = await db.insert(products).values({
      ...data,
      businessId,
      costPrice: data.costPrice.toString(),
      baseStockQuantity: data.baseStockQuantity.toString(),
      lowStockThreshold: data.lowStockThreshold.toString(),
      createdBy: userId,
    }).returning();
    return product;
  }

  static async getProducts(businessId: string, limit = 50, offset = 0, isActive?: boolean) {
    const conditions = [eq(products.businessId, businessId)];
    if (isActive !== undefined) {
      conditions.push(eq(products.isActive, isActive));
    }

    const result = await db.select({
      id: products.id,
      name: products.name,
      categoryId: products.categoryId,
      categoryName: categories.name,
      costPrice: products.costPrice,
      baseStockQuantity: products.baseStockQuantity,
      lowStockThreshold: products.lowStockThreshold,
      isActive: products.isActive,
    })
    .from(products)
    .leftJoin(categories, eq(products.categoryId, categories.id))
    .where(and(...conditions))
    .orderBy(products.name)
    .limit(limit)
    .offset(offset);
    
    return result;
  }

  static async getProductDetails(productId: string, businessId: string) {
    const [product] = await db.select()
      .from(products)
      .where(and(eq(products.id, productId), eq(products.businessId, businessId)));
      
    if (!product) throw new AppError('Product not found', 404);

    const units = await db.select()
      .from(productUnits)
      .where(and(eq(productUnits.productId, productId), eq(productUnits.businessId, businessId)));
    
    return {
      ...product,
      units,
    };
  }

  static async updateProduct(productId: string, data: any, businessId: string) {
    if (data.categoryId) {
      const [category] = await db.select().from(categories).where(and(eq(categories.id, data.categoryId), eq(categories.businessId, businessId)));
      if (!category) throw new AppError('Category not found or does not belong to this business', 400);
    }

    const [product] = await db.update(products)
      .set({
        ...data,
        ...(data.costPrice !== undefined && { costPrice: data.costPrice.toString() }),
        ...(data.baseStockQuantity !== undefined && { baseStockQuantity: data.baseStockQuantity.toString() }),
        ...(data.lowStockThreshold !== undefined && { lowStockThreshold: data.lowStockThreshold.toString() }),
      })
      .where(and(eq(products.id, productId), eq(products.businessId, businessId)))
      .returning();

    if (!product) throw new AppError('Product not found', 404);
    return product;
  }

  // --- PRODUCT UNITS ---
  static async updateProductUnit(productId: string, unitId: string, data: any, businessId: string) {
    const [unit] = await db.update(productUnits)
      .set({
        ...data,
        ...(data.sellingPrice !== undefined && { sellingPrice: data.sellingPrice.toString() }),
      })
      .where(and(eq(productUnits.id, unitId), eq(productUnits.productId, productId), eq(productUnits.businessId, businessId)))
      .returning();

    if (!unit) throw new AppError('Product unit not found', 404);
    return unit;
  }
  static async createProductUnit(data: CreateProductUnitInput, businessId: string) {
    // Cross-tenant validation: ensure product belongs to business
    const [product] = await db.select().from(products).where(and(eq(products.id, data.productId), eq(products.businessId, businessId)));
    if (!product) throw new AppError('Product not found or does not belong to this business', 400);

    // If this is set as default, unset other defaults for this product
    if (data.isDefault) {
      await db.update(productUnits)
        .set({ isDefault: false })
        .where(and(eq(productUnits.productId, data.productId), eq(productUnits.businessId, businessId)));
    }

    const [unit] = await db.insert(productUnits).values({
      ...data,
      businessId,
      sellingPrice: data.sellingPrice.toString(),
      conversionFactor: data.conversionFactor.toString(),
    }).returning();
    return unit;
  }
}
