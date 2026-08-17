import { eq, and, desc, sql } from 'drizzle-orm';
import { db } from '../../db';
import { restockItems, productVariants, products } from '../../db/schema';
import { AppError } from '../../core/utils/AppError';

export class RestockService {
  static async syncLowStockItems(businessId: string) {
    try {
      const lowStockVariants = await db
        .select({
          id: productVariants.id,
        })
        .from(productVariants)
        .innerJoin(products, eq(productVariants.productId, products.id))
        .where(
          and(
            eq(products.businessId, businessId),
            eq(productVariants.isActive, true),
            eq(products.isActive, true),
            sql`${productVariants.baseStockQuantity} <= ${productVariants.lowStockThreshold}`
          )
        );

      for (const v of lowStockVariants) {
        const [existing] = await db
          .select()
          .from(restockItems)
          .where(and(eq(restockItems.businessId, businessId), eq(restockItems.variantId, v.id)));

        if (!existing) {
          await db.insert(restockItems).values({
            businessId,
            variantId: v.id,
          }).catch(() => {});
        }
      }
    } catch (err) {
      console.error('Error syncing low stock items to restock list:', err);
    }
  }

  static async getRestockItems(businessId: string) {
    await this.syncLowStockItems(businessId);

    const items = await db.select({
      id: restockItems.id,
      variantId: restockItems.variantId,
      variantName: productVariants.name,
      productName: products.name,
      isOrdered: restockItems.isOrdered,
      currentStock: productVariants.baseStockQuantity,
      createdAt: restockItems.createdAt,
    })
    .from(restockItems)
    .innerJoin(productVariants, eq(restockItems.variantId, productVariants.id))
    .innerJoin(products, eq(productVariants.productId, products.id))
    .where(eq(restockItems.businessId, businessId))
    .orderBy(desc(restockItems.createdAt));

    return items;
  }

  static async addToRestockList(businessId: string, userId: string, variantId: string) {
    // Upsert logic: If it already exists for this business/variant, don't throw an error, just return it.
    const [existing] = await db.select().from(restockItems)
      .where(and(eq(restockItems.businessId, businessId), eq(restockItems.variantId, variantId)));

    if (existing) {
      return existing;
    }

    const [newItem] = await db.insert(restockItems).values({
      businessId,
      variantId,
      createdBy: userId,
    }).returning();

    return newItem;
  }

  static async updateRestockItem(businessId: string, itemId: string, isOrdered: boolean) {
    const [updated] = await db.update(restockItems)
      .set({ isOrdered })
      .where(and(eq(restockItems.id, itemId), eq(restockItems.businessId, businessId)))
      .returning();

    if (!updated) {
      throw new AppError('Restock item not found', 404);
    }

    return updated;
  }

  static async clearOrderedItems(businessId: string) {
    await db.delete(restockItems)
      .where(and(eq(restockItems.businessId, businessId), eq(restockItems.isOrdered, true)));
  }
}
