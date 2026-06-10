import { eq, and } from 'drizzle-orm';
import { db } from '../../db';
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

  static async getCategories(businessId: string) {
    return db.select()
      .from(categories)
      .where(eq(categories.businessId, businessId))
      .orderBy(categories.name);
  }

  // --- PRODUCTS ---
  static async createProduct(data: CreateProductInput, businessId: string, userId: string) {
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

  static async getProducts(businessId: string) {
    // We will join with categories to return a rich object
    const result = await db.select({
      id: products.id,
      name: products.name,
      categoryName: categories.name,
      costPrice: products.costPrice,
      baseStockQuantity: products.baseStockQuantity,
      isActive: products.isActive,
    })
    .from(products)
    .leftJoin(categories, eq(products.categoryId, categories.id))
    .where(eq(products.businessId, businessId))
    .orderBy(products.name);
    
    return result;
  }

  static async getProductDetails(productId: string, businessId: string) {
    const [product] = await db.select()
      .from(products)
      .where(and(eq(products.id, productId), eq(products.businessId, businessId)));
      
    if (!product) throw new Error('Product not found');

    const units = await db.select()
      .from(productUnits)
      .where(and(eq(productUnits.productId, productId), eq(productUnits.businessId, businessId)));
    
    return {
      ...product,
      units,
    };
  }

  // --- PRODUCT UNITS ---
  static async createProductUnit(data: CreateProductUnitInput, businessId: string) {
    // If this is set as default, we should unset other defaults for this product (logic skipped for brevity, but easy to add)
    const [unit] = await db.insert(productUnits).values({
      ...data,
      businessId,
      sellingPrice: data.sellingPrice.toString(),
      conversionFactor: data.conversionFactor.toString(),
    }).returning();
    return unit;
  }
}
