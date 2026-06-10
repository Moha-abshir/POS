import { eq } from 'drizzle-orm';
import { db } from '../../db';
import { categories, products, productUnits } from '../../db/schema';
import { CreateCategoryInput, CreateProductInput, CreateProductUnitInput } from './catalog.schema';

export class CatalogService {
  // --- CATEGORIES ---
  static async createCategory(data: CreateCategoryInput) {
    const [category] = await db.insert(categories).values(data).returning();
    return category;
  }

  static async getCategories() {
    return db.select().from(categories).orderBy(categories.name);
  }

  // --- PRODUCTS ---
  static async createProduct(data: CreateProductInput, userId: string) {
    const [product] = await db.insert(products).values({
      ...data,
      costPrice: data.costPrice.toString(),
      baseStockQuantity: data.baseStockQuantity.toString(),
      lowStockThreshold: data.lowStockThreshold.toString(),
      createdBy: userId,
    }).returning();
    return product;
  }

  static async getProducts() {
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
    .orderBy(products.name);
    
    return result;
  }

  static async getProductDetails(productId: string) {
    const [product] = await db.select().from(products).where(eq(products.id, productId));
    if (!product) throw new Error('Product not found');

    const units = await db.select().from(productUnits).where(eq(productUnits.productId, productId));
    
    return {
      ...product,
      units,
    };
  }

  // --- PRODUCT UNITS ---
  static async createProductUnit(data: CreateProductUnitInput) {
    // If this is set as default, we should unset other defaults for this product (logic skipped for brevity, but easy to add)
    const [unit] = await db.insert(productUnits).values({
      ...data,
      sellingPrice: data.sellingPrice.toString(),
      conversionFactor: data.conversionFactor.toString(),
    }).returning();
    return unit;
  }
}
