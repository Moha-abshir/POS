import { eq, and, sql, desc } from 'drizzle-orm';
import { db } from '../../db';
import { productVariants, stockMovements, damagedGoods, purchases, products, users, suppliers } from '../../db/schema';
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

  static async getStockMovements(businessId: string, filters: { limit?: number; offset?: number; type?: string; startDate?: string; endDate?: string; product?: string; invoiceRef?: string; mpesaRef?: string } = {}) {
    const { limit = 50, offset = 0 } = filters;
    const conditions: any[] = [eq(stockMovements.businessId, businessId)];

    if (filters.type) {
      conditions.push(eq(stockMovements.type, filters.type as any));
    }
    if (filters.startDate) {
      conditions.push(sql`${stockMovements.createdAt} >= ${new Date(filters.startDate).toISOString()}`);
    }
    if (filters.endDate) {
      conditions.push(sql`${stockMovements.createdAt} <= ${new Date(filters.endDate).toISOString()}`);
    }
    if (filters.product) {
      conditions.push(sql`${products.name} ILIKE ${`%${filters.product}%`}`);
    }
    if (filters.invoiceRef) {
      conditions.push(sql`${purchases.invoiceRef} ILIKE ${`%${filters.invoiceRef}%`}`);
    }
    if (filters.mpesaRef) {
      conditions.push(sql`${purchases.mpesaRef} ILIKE ${`%${filters.mpesaRef}%`}`);
    }

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
      supplierName: suppliers.name,
      createdAt: stockMovements.createdAt,
    })
    .from(stockMovements)
    .innerJoin(productVariants, eq(stockMovements.variantId, productVariants.id))
    .innerJoin(products, eq(productVariants.productId, products.id))
    .leftJoin(purchases, and(eq(stockMovements.referenceId, purchases.id), eq(stockMovements.referenceType, 'PURCHASE')))
    .leftJoin(suppliers, eq(purchases.supplierId, suppliers.id))
    .where(and(...conditions))
    .orderBy(desc(stockMovements.createdAt))
    .limit(limit)
    .offset(offset);

    const [{ count }] = await db.select({ count: sql`count(*)`.mapWith(Number) })
      .from(stockMovements)
      .innerJoin(productVariants, eq(stockMovements.variantId, productVariants.id))
      .innerJoin(products, eq(productVariants.productId, products.id))
      .leftJoin(purchases, and(eq(stockMovements.referenceId, purchases.id), eq(stockMovements.referenceType, 'PURCHASE')))
      .where(and(...conditions));

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

    const [variant] = await db.select({ stock: productVariants.baseStockQuantity })
      .from(productVariants)
      .where(and(eq(productVariants.id, data.variantId), eq(productVariants.businessId, businessId)));
      
    if (!variant) throw new AppError('Product variant not found', 404);
    if (Number(variant.stock) < data.quantity) {
      throw new AppError(`Insufficient stock. Current stock is ${Number(variant.stock)}, but you tried to deduct ${data.quantity}.`, 400);
    }

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

  static async getDamages(businessId: string, limit = 50, offset = 0) {
    const data = await db.select({
      id: damagedGoods.id,
      variantId: damagedGoods.variantId,
      variantName: productVariants.name,
      productName: products.name,
      quantity: damagedGoods.quantity,
      reason: damagedGoods.reason,
      damagedAt: damagedGoods.damagedAt,
      createdBy: users.firstName,
    })
    .from(damagedGoods)
    .innerJoin(productVariants, eq(damagedGoods.variantId, productVariants.id))
    .innerJoin(products, eq(productVariants.productId, products.id))
    .leftJoin(users, eq(damagedGoods.createdBy, users.id))
    .where(eq(damagedGoods.businessId, businessId))
    .orderBy(desc(damagedGoods.damagedAt))
    .limit(limit)
    .offset(offset);

    const [{ count }] = await db.select({ count: sql`count(*)`.mapWith(Number) })
      .from(damagedGoods)
      .where(eq(damagedGoods.businessId, businessId));

    return {
      data,
      meta: { total: count, limit, offset }
    };
  }
}
