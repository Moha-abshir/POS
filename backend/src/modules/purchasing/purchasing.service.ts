import { eq, and, sql, inArray } from 'drizzle-orm';
import { db, transactionWithRetry } from '../../db';
import { purchases, purchaseItems, suppliers, payments, productVariants, variantUnits, products } from '../../db/schema';
import { AppError } from '../../core/utils/AppError';
import { InventoryService } from '../inventory/inventory.service';
import { flushPattern } from '../../core/cache/redis';

export class PurchasingService {
  static async createPurchase(
    businessId: string, 
    userId: string, 
    data: {
      supplierId: string;
      items: { variantId: string; unitId: string; quantity: number; costPrice: number }[];
      amountPaid: number;
      paymentMethod: 'CASH' | 'MPESA';
      invoiceRef?: string;
      mpesaRef?: string;
    }
  ) {
    // Sort items by variantId to guarantee consistent locking order and prevent deadlocks
    const sortedItems = [...data.items].sort((a, b) => a.variantId.localeCompare(b.variantId));

    const result = await transactionWithRetry(async (tx) => {
      // 0. Cross-tenant validation
      const [supplier] = await tx.select().from(suppliers).where(and(eq(suppliers.id, data.supplierId), eq(suppliers.businessId, businessId)));
      if (!supplier) throw new AppError('Supplier not found or unauthorized', 404);

      const variantIds = Array.from(new Set(sortedItems.map(item => item.variantId)));
      const foundVariants = await tx.select().from(productVariants).where(and(inArray(productVariants.id, variantIds), eq(productVariants.businessId, businessId)));
      if (foundVariants.length !== variantIds.length) {
        throw new AppError('One or more variants not found or unauthorized', 404);
      }

      const unitIds = Array.from(new Set(sortedItems.map(item => item.unitId)));
      const foundUnits = await tx.select().from(variantUnits).where(and(inArray(variantUnits.id, unitIds), eq(variantUnits.businessId, businessId)));
      if (foundUnits.length !== unitIds.length) {
        throw new AppError('One or more units not found or unauthorized', 404);
      }

      const unitMap = new Map<string, number>(foundUnits.map((u: any) => [u.id as string, Number(u.conversionFactor)]));

      // 1. Calculate totals
      let totalAmount = 0;
      sortedItems.forEach(item => {
        totalAmount += item.quantity * item.costPrice;
      });

      const paymentStatus = data.amountPaid >= totalAmount ? 'PAID' : (data.amountPaid > 0 ? 'PARTIAL' : 'UNPAID');

      // 2. Create Purchase record
      const [purchase] = await tx.insert(purchases).values({
        businessId,
        supplierId: data.supplierId,
        totalAmount: totalAmount.toString(),
        amountPaid: data.amountPaid.toString(),
        paymentStatus,
        invoiceRef: data.invoiceRef,
        mpesaRef: data.paymentMethod === 'CASH' ? 'CASH' : (data.mpesaRef ? data.mpesaRef.toUpperCase() : null),
        createdBy: userId,
      }).returning();

      // 3. Create Purchase Items & Update Inventory
      const purchaseItemsData = sortedItems.map(item => {
        const subtotal = item.quantity * item.costPrice;
        return {
          businessId,
          purchaseId: purchase.id,
          variantId: item.variantId,
          unitId: item.unitId,
          quantity: item.quantity.toString(),
          costPrice: item.costPrice.toString(),
          subtotal: subtotal.toString(),
        };
      });
      if (purchaseItemsData.length > 0) {
        await tx.insert(purchaseItems).values(purchaseItemsData);
      }

      for (const item of sortedItems) {
        const conversionFactor = unitMap.get(item.unitId) || 1;
        const baseQuantity = item.quantity * conversionFactor;

        // Record stock movement (which updates variant baseStockQuantity)
        await InventoryService.recordMovement(tx, businessId, {
          variantId: item.variantId,
          type: 'PURCHASE',
          quantityChange: baseQuantity,
          referenceType: 'PURCHASE',
          referenceId: purchase.id,
          notes: 'Added Stock',
          userId
        });
      }

      // 4. Record Payment if amountPaid > 0
      if (data.amountPaid > 0) {
        await tx.insert(payments).values({
          businessId,
          referenceType: 'PURCHASE',
          referenceId: purchase.id,
          amount: data.amountPaid.toString(),
          method: data.paymentMethod,
          status: 'COMPLETED',
          mpesaReceiptNumber: data.paymentMethod === 'MPESA' ? data.mpesaRef?.toUpperCase() : null,
          notes: `Initial payment for purchase ${purchase.id}`,
          paidAt: new Date(),
          createdBy: userId,
        });
      }

      // 5. Update Supplier Balance (if they weren't fully paid, the store owes them)
      const balanceChange = totalAmount - data.amountPaid;
      if (balanceChange !== 0) {
        const updateResult = await tx.update(suppliers)
          .set({ balance: sql`${suppliers.balance} + ${balanceChange}` })
          .where(and(eq(suppliers.id, data.supplierId), eq(suppliers.businessId, businessId)))
          .returning();

        if (updateResult.length === 0) {
          throw new AppError('Supplier not found or deleted', 404);
        }
      }

      return purchase;
    });

    try {
      await flushPattern(`cache:${businessId}:/catalog*`);
    } catch (err) {
      console.error('Failed to flush catalog cache on purchase:', err);
    }

    return result;
  }

  static async getPurchases(businessId: string, filters: any = {}, limit = 50, offset = 0) {
    const conditions = [eq(purchases.businessId, businessId)];

    if (filters.startDate) {
      conditions.push(sql`${purchases.purchasedAt} >= ${new Date(filters.startDate).toISOString()}`);
    }
    if (filters.endDate) {
      conditions.push(sql`${purchases.purchasedAt} <= ${new Date(filters.endDate).toISOString()}`);
    }
    if (filters.supplier) {
      conditions.push(sql`${suppliers.name} ILIKE ${`%${filters.supplier}%`}`);
    }
    if (filters.invoiceRef) {
      conditions.push(sql`${purchases.invoiceRef} ILIKE ${`%${filters.invoiceRef}%`}`);
    }
    if (filters.mpesaRef) {
      conditions.push(sql`${purchases.mpesaRef} ILIKE ${`%${filters.mpesaRef}%`}`);
    }
    if (filters.paymentMethod) {
      conditions.push(sql`EXISTS (SELECT 1 FROM payments p WHERE p.reference_id = purchases.id AND p.reference_type = 'PURCHASE' AND p.method = ${filters.paymentMethod})`);
    }

    const data = await db.select({
      id: purchases.id,
      supplierId: purchases.supplierId,
      supplierName: suppliers.name,
      totalAmount: purchases.totalAmount,
      amountPaid: purchases.amountPaid,
      paymentStatus: purchases.paymentStatus,
      invoiceRef: purchases.invoiceRef,
      mpesaRef: purchases.mpesaRef,
      purchasedAt: purchases.purchasedAt,
      createdAt: purchases.createdAt,
    })
    .from(purchases)
    .leftJoin(suppliers, eq(purchases.supplierId, suppliers.id))
    .where(and(...conditions))
    .orderBy(sql`${purchases.purchasedAt} DESC`)
    .limit(limit)
    .offset(offset);

    const [{ count }] = await db.select({ count: sql`count(*)`.mapWith(Number) })
      .from(purchases)
      .leftJoin(suppliers, eq(purchases.supplierId, suppliers.id))
      .where(and(...conditions));

    return {
      data,
      meta: { total: count, limit, offset }
    };
  }

  static async getPurchaseDetails(businessId: string, purchaseId: string) {
    const [purchase] = await db.select({
      id: purchases.id,
      supplierId: purchases.supplierId,
      supplierName: suppliers.name,
      totalAmount: purchases.totalAmount,
      amountPaid: purchases.amountPaid,
      paymentStatus: purchases.paymentStatus,
      invoiceRef: purchases.invoiceRef,
      mpesaRef: purchases.mpesaRef,
      purchasedAt: purchases.purchasedAt,
      createdAt: purchases.createdAt,
    })
    .from(purchases)
    .leftJoin(suppliers, eq(purchases.supplierId, suppliers.id))
    .where(and(eq(purchases.id, purchaseId), eq(purchases.businessId, businessId)));

    if (!purchase) {
      throw new AppError('Purchase not found', 404);
    }

    const items = await db.select({
      id: purchaseItems.id,
      variantId: purchaseItems.variantId,
      variantName: productVariants.name,
      productName: products.name,
      unitId: purchaseItems.unitId,
      unitName: variantUnits.name,
      quantity: purchaseItems.quantity,
      costPrice: purchaseItems.costPrice,
      subtotal: purchaseItems.subtotal,
    })
    .from(purchaseItems)
    .leftJoin(productVariants, eq(purchaseItems.variantId, productVariants.id))
    .leftJoin(products, eq(productVariants.productId, products.id))
    .leftJoin(variantUnits, eq(purchaseItems.unitId, variantUnits.id))
    .where(and(eq(purchaseItems.purchaseId, purchaseId), eq(purchaseItems.businessId, businessId)));

    return {
      ...purchase,
      items
    };
  }
}
