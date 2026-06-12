import { eq, and, sql, desc } from 'drizzle-orm';
import { db } from '../../db';
import { products, stockMovements, damagedGoods } from '../../db/schema';
import { AppError } from '../../core/utils/AppError';

export class InventoryService {
  /**
   * Core ledger function. Must be called inside a transaction.
   */
  static async recordMovement(
    tx: any,
    businessId: string,
    data: {
      productId: string;
      type: 'PURCHASE' | 'SALE' | 'REFUND' | 'DAMAGE' | 'ADJUSTMENT';
      quantityChange: number;
      referenceType?: string;
      referenceId?: string;
      notes?: string;
      userId: string;
    }
  ) {
    // 1. Insert into ledger
    await tx.insert(stockMovements).values({
      businessId,
      productId: data.productId,
      type: data.type,
      quantityChange: data.quantityChange.toString(),
      referenceType: data.referenceType,
      referenceId: data.referenceId,
      notes: data.notes,
      createdBy: data.userId,
    });

    // 2. Update cached baseStockQuantity
    const [updatedProduct] = await tx.update(products)
      .set({
        baseStockQuantity: sql`${products.baseStockQuantity} + ${data.quantityChange}`,
        updatedAt: new Date()
      })
      .where(and(eq(products.id, data.productId), eq(products.businessId, businessId)))
      .returning();

    if (!updatedProduct) {
      throw new AppError('Product not found for stock update', 404);
    }

    // Low stock checking can be done asynchronously or handled via a notification table later
    // For now, we return the updated product stock
    return updatedProduct.baseStockQuantity;
  }

  static async getStockMovements(businessId: string, limit = 50, offset = 0) {
    return await db.select({
      id: stockMovements.id,
      productId: stockMovements.productId,
      productName: products.name,
      type: stockMovements.type,
      quantityChange: stockMovements.quantityChange,
      referenceType: stockMovements.referenceType,
      notes: stockMovements.notes,
      createdAt: stockMovements.createdAt,
    })
    .from(stockMovements)
    .innerJoin(products, eq(stockMovements.productId, products.id))
    .where(eq(stockMovements.businessId, businessId))
    .orderBy(desc(stockMovements.createdAt))
    .limit(limit)
    .offset(offset);
  }

  static async manualAdjustment(businessId: string, userId: string, data: { productId: string, newQuantity: number, notes: string }) {
    return await db.transaction(async (tx) => {
      const [product] = await tx.select().from(products).where(and(eq(products.id, data.productId), eq(products.businessId, businessId)));
      if (!product) throw new AppError('Product not found', 404);

      const currentStock = Number(product.baseStockQuantity);
      const difference = data.newQuantity - currentStock;

      if (difference === 0) return product;

      await this.recordMovement(tx, businessId, {
        productId: data.productId,
        type: 'ADJUSTMENT',
        quantityChange: difference,
        notes: data.notes,
        userId
      });

      return await tx.select().from(products).where(eq(products.id, data.productId));
    });
  }

  static async recordDamage(businessId: string, userId: string, data: { productId: string, quantity: number, reason: string }) {
    return await db.transaction(async (tx) => {
      // Record in damaged_goods table
      await tx.insert(damagedGoods).values({
        businessId,
        productId: data.productId,
        quantity: data.quantity.toString(),
        reason: data.reason,
        createdBy: userId,
      });

      // Update ledger and stock (-quantity)
      await this.recordMovement(tx, businessId, {
        productId: data.productId,
        type: 'DAMAGE',
        quantityChange: -data.quantity,
        notes: data.reason,
        userId
      });
    });
  }
}
