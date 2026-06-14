import { eq, and, sql, desc } from 'drizzle-orm';
import { db } from '../../db';
import { productVariants, stockMovements, damagedGoods, purchases, products } from '../../db/schema';
import { AppError } from '../../core/utils/AppError';

export class InventoryService {
  /**
   * Core ledger function. Must be called inside a transaction.
   */
  static async recordMovement(
    tx: any,
    businessId: string,
    data: {
      variantId: string;
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
      variantId: data.variantId,
      type: data.type,
      quantityChange: data.quantityChange.toString(),
      referenceType: data.referenceType,
      referenceId: data.referenceId,
      notes: data.notes,
      createdBy: data.userId,
    });

    // 2. Update cached baseStockQuantity
    const [updatedVariant] = await tx.update(productVariants)
      .set({
        baseStockQuantity: sql`${productVariants.baseStockQuantity} + ${data.quantityChange}`,
        updatedAt: new Date()
      })
      .where(and(eq(productVariants.id, data.variantId), eq(productVariants.businessId, businessId)))
      .returning();

    if (!updatedVariant) {
      throw new AppError('Variant not found for stock update', 404);
    }

    if (Number(updatedVariant.baseStockQuantity) < 0) {
      throw new AppError(`Insufficient stock for variant ${updatedVariant.name}`, 400);
    }

    return updatedVariant.baseStockQuantity;
  }

  static async getStockMovements(businessId: string, limit = 50, offset = 0) {
    const data = await db.select({
      id: stockMovements.id,
      variantId: stockMovements.variantId,
      variantName: productVariants.name,
      productName: products.name,
      type: stockMovements.type,
      quantityChange: stockMovements.quantityChange,
      referenceType: stockMovements.referenceType,
      notes: stockMovements.notes,
      invoiceRef: purchases.invoiceRef,
      mpesaRef: purchases.mpesaRef,
      createdAt: stockMovements.createdAt,
    })
    .from(stockMovements)
    .innerJoin(productVariants, eq(stockMovements.variantId, productVariants.id))
    .innerJoin(products, eq(productVariants.productId, products.id))
    .leftJoin(purchases, and(eq(stockMovements.referenceId, purchases.id), eq(stockMovements.referenceType, 'PURCHASE')))
    .where(eq(stockMovements.businessId, businessId))
    .orderBy(desc(stockMovements.createdAt))
    .limit(limit)
    .offset(offset);

    const [{ count }] = await db.select({ count: sql`count(*)`.mapWith(Number) })
      .from(stockMovements)
      .where(eq(stockMovements.businessId, businessId));

    return {
      data,
      meta: { total: count, limit, offset }
    };
  }

  static async manualAdjustment(businessId: string, userId: string, data: { variantId: string, newQuantity: number, notes?: string }) {
    return await db.transaction(async (tx) => {
      const [variant] = await tx.select().from(productVariants).where(and(eq(productVariants.id, data.variantId), eq(productVariants.businessId, businessId))).for('update');
      if (!variant) throw new AppError('Variant not found', 404);

      const currentStock = Number(variant.baseStockQuantity);
      const difference = data.newQuantity - currentStock;

      if (difference === 0) return variant;

      await this.recordMovement(tx, businessId, {
        variantId: data.variantId,
        type: 'ADJUSTMENT',
        quantityChange: difference,
        notes: data.notes,
        userId
      });

      return await tx.select().from(productVariants).where(eq(productVariants.id, data.variantId));
    });
  }

  static async recordDamage(businessId: string, userId: string, data: { variantId: string, quantity: number, reason?: string }) {
    if (data.quantity <= 0) throw new AppError('Damage quantity must be positive', 400);

    return await db.transaction(async (tx) => {
      await this.recordMovement(tx, businessId, {
        variantId: data.variantId,
        type: 'DAMAGE',
        quantityChange: -data.quantity,
        notes: data.reason,
        userId
      });

      const [damage] = await tx.insert(damagedGoods).values({
        businessId,
        variantId: data.variantId,
        quantity: data.quantity.toString(),
        reason: data.reason,
        createdBy: userId,
      }).returning();
    });
  }
}
