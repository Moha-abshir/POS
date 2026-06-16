import { eq, and, inArray, sql } from 'drizzle-orm';
import { db } from '../../db';
import { AppError } from '../../core/utils/AppError';
import { categories, products, productVariants, variantUnits } from '../../db/schema';
import { CreateCategoryInput, CreateProductInput, CreateVariantUnitInput, UpdateProductInput, UpdateVariantInput, UpdateVariantUnitInput } from './catalog.schema';
import { InventoryService } from '../inventory/inventory.service';

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
    const data = await db.select()
      .from(categories)
      .where(eq(categories.businessId, businessId))
      .orderBy(categories.name)
      .limit(limit)
      .offset(offset);

    const [{ count }] = await db.select({ count: sql`count(*)`.mapWith(Number) })
      .from(categories)
      .where(eq(categories.businessId, businessId));

    return {
      data,
      meta: { total: count, limit, offset }
    };
  }

  // --- PRODUCTS & VARIANTS ---
  static async createProduct(data: CreateProductInput, businessId: string, userId: string) {
    if (data.categoryId) {
      const [category] = await db.select().from(categories).where(and(eq(categories.id, data.categoryId), eq(categories.businessId, businessId)));
      if (!category) throw new AppError('Category not found or does not belong to this business', 400);
    }

    return await db.transaction(async (tx) => {
      // 1. Insert product
      const [product] = await tx.insert(products).values({
        name: data.name,
        description: data.description,
        categoryId: data.categoryId,
        businessId,
        createdBy: userId,
      }).returning();

      const createdVariants = [];

      // 2. Insert variants
      for (const v of data.variants) {
        const [variant] = await tx.insert(productVariants).values({
          businessId,
          productId: product.id,
          name: v.name,
          sku: v.sku,
          imageUrl: v.imageUrl,
          costPrice: v.costPrice.toString(),
          baseUnitName: v.baseUnitName,
          baseStockQuantity: '0', 
          lowStockThreshold: v.lowStockThreshold.toString(),
        }).returning();

        // 3. Insert units
        const unitsToInsert = v.units.map(u => ({
          businessId,
          variantId: variant.id,
          name: u.name,
          sellingPrice: u.sellingPrice.toString(),
          conversionFactor: u.conversionFactor.toString(),
          isDefault: u.isDefault,
        }));
        const createdUnits = await tx.insert(variantUnits).values(unitsToInsert).returning();

        // 4. Record opening stock
        if (v.initialStock > 0) {
          await InventoryService.recordMovement(tx, businessId, {
            variantId: variant.id,
            type: 'ADJUSTMENT',
            quantityChange: v.initialStock,
            notes: 'Opening stock',
            userId,
          });
          variant.baseStockQuantity = v.initialStock.toString();
        }

        createdVariants.push({
          ...variant,
          units: createdUnits
        });
      }

      return {
        ...product,
        variants: createdVariants
      };
    });
  }

  static async getProducts(businessId: string, limit = 50, offset = 0, isActive?: boolean) {
    const conditions = [eq(products.businessId, businessId)];
    if (isActive !== undefined) {
      conditions.push(eq(products.isActive, isActive));
    }

    const result = await db.select({
      id: products.id,
      name: products.name,
      description: products.description,
      categoryId: products.categoryId,
      categoryName: categories.name,
      isActive: products.isActive,
    })
    .from(products)
    .leftJoin(categories, eq(products.categoryId, categories.id))
    .where(and(...conditions))
    .orderBy(products.name)
    .limit(limit)
    .offset(offset);

    const productIds = result.map(p => p.id);
    let variantsMap: Record<string, any[]> = {};
    
    if (productIds.length > 0) {
      const variants = await db.select()
        .from(productVariants)
        .where(and(eq(productVariants.businessId, businessId), inArray(productVariants.productId, productIds)));
        
      const variantIds = variants.map(v => v.id);
      let unitsMap: Record<string, any[]> = {};
      
      if (variantIds.length > 0) {
        const units = await db.select()
          .from(variantUnits)
          .where(and(eq(variantUnits.businessId, businessId), inArray(variantUnits.variantId, variantIds)));
          
        units.forEach(u => {
          if (!unitsMap[u.variantId]) unitsMap[u.variantId] = [];
          unitsMap[u.variantId].push(u);
        });
      }

      variants.forEach(v => {
        if (!variantsMap[v.productId]) variantsMap[v.productId] = [];
        variantsMap[v.productId].push({ ...v, units: unitsMap[v.id] || [] });
      });
    }

    const [{ count }] = await db.select({ count: sql`count(*)`.mapWith(Number) })
      .from(products)
      .where(and(...conditions));

    return {
      data: result.map(p => ({
        ...p,
        variants: variantsMap[p.id] || []
      })),
      meta: {
        total: count,
        limit,
        offset
      }
    };
  }

  static async getProductDetails(productId: string, businessId: string) {
    const [product] = await db.select()
      .from(products)
      .where(and(eq(products.id, productId), eq(products.businessId, businessId)));
      
    if (!product) throw new AppError('Product not found', 404);

    const variants = await db.select()
      .from(productVariants)
      .where(and(eq(productVariants.productId, productId), eq(productVariants.businessId, businessId)));

    const variantIds = variants.map(v => v.id);
    let unitsMap: Record<string, any[]> = {};

    if (variantIds.length > 0) {
      const units = await db.select()
        .from(variantUnits)
        .where(and(eq(variantUnits.businessId, businessId), inArray(variantUnits.variantId, variantIds)));
      
      units.forEach(u => {
        if (!unitsMap[u.variantId]) unitsMap[u.variantId] = [];
        unitsMap[u.variantId].push(u);
      });
    }

    const variantsWithUnits = variants.map(v => ({
      ...v,
      units: unitsMap[v.id] || []
    }));

    return {
      ...product,
      variants: variantsWithUnits,
    };
  }

  static async updateProduct(productId: string, data: UpdateProductInput, businessId: string) {
    if (data.categoryId) {
      const [category] = await db.select().from(categories).where(and(eq(categories.id, data.categoryId), eq(categories.businessId, businessId)));
      if (!category) throw new AppError('Category not found or does not belong to this business', 400);
    }

    const [product] = await db.update(products)
      .set(data)
      .where(and(eq(products.id, productId), eq(products.businessId, businessId)))
      .returning();

    if (!product) throw new AppError('Product not found', 404);
    return product;
  }

  // --- VARIANT UPDATES ---
  static async updateVariant(variantId: string, data: UpdateVariantInput, businessId: string) {
    const { costPrice, lowStockThreshold, ...rest } = data;
    const [variant] = await db.update(productVariants)
      .set({
        ...rest,
        ...(costPrice !== undefined && { costPrice: costPrice.toString() }),
        ...(lowStockThreshold !== undefined && { lowStockThreshold: lowStockThreshold.toString() }),
      })
      .where(and(eq(productVariants.id, variantId), eq(productVariants.businessId, businessId)))
      .returning();

    if (!variant) throw new AppError('Variant not found', 404);
    return variant;
  }

  // --- VARIANT UNITS ---
  static async createVariantUnit(data: CreateVariantUnitInput, businessId: string) {
    const [variant] = await db.select().from(productVariants).where(and(eq(productVariants.id, data.variantId), eq(productVariants.businessId, businessId)));
    if (!variant) throw new AppError('Variant not found', 400);

    const existingUnits = await db.select().from(variantUnits).where(and(eq(variantUnits.variantId, data.variantId), eq(variantUnits.businessId, businessId)));
    if (existingUnits.length === 0) {
      data.isDefault = true;
    }

    if (data.isDefault) {
      await db.update(variantUnits)
        .set({ isDefault: false })
        .where(and(eq(variantUnits.variantId, data.variantId), eq(variantUnits.businessId, businessId)));
    }

    const [unit] = await db.insert(variantUnits).values({
      ...data,
      businessId,
      sellingPrice: data.sellingPrice.toString(),
      conversionFactor: data.conversionFactor.toString(),
    }).returning();
    return unit;
  }

  static async updateVariantUnit(unitId: string, variantId: string, data: UpdateVariantUnitInput, businessId: string) {
    if (data.isDefault === false) {
      const [currentUnit] = await db.select().from(variantUnits).where(and(eq(variantUnits.id, unitId), eq(variantUnits.businessId, businessId)));
      if (currentUnit?.isDefault) {
        throw new AppError('Cannot unset the default unit. Set another unit as default instead.', 400);
      }
    }

    if (data.isDefault) {
      await db.update(variantUnits)
        .set({ isDefault: false })
        .where(and(eq(variantUnits.variantId, variantId), eq(variantUnits.businessId, businessId)));
    }

    const { sellingPrice, conversionFactor, ...rest } = data;
    const [unit] = await db.update(variantUnits)
      .set({
        ...rest,
        ...(sellingPrice !== undefined && { sellingPrice: sellingPrice.toString() }),
        ...(conversionFactor !== undefined && { conversionFactor: conversionFactor.toString() }),
      })
      .where(and(eq(variantUnits.id, unitId), eq(variantUnits.variantId, variantId), eq(variantUnits.businessId, businessId)))
      .returning();

    if (!unit) throw new AppError('Variant unit not found', 404);
    return unit;
  }
}

