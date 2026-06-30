import { eq, and, sql, inArray } from 'drizzle-orm';
import { db, transactionWithRetry } from '../../db';
import { purchases, purchaseItems, suppliers, payments, productVariants, variantUnits } from '../../db/schema';
import { AppError } from '../../core/utils/AppError';
import { InventoryService } from '../inventory/inventory.service';

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

    return await transactionWithRetry(async (tx) => {
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

      const unitMap = new Map(foundUnits.map(u => [u.id, Number(u.conversionFactor)]));

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
          mpesaReceiptNumber: data.paymentMethod === 'MPESA' && data.mpesaRef ? data.mpesaRef.toUpperCase() : null,
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
  }

  static async getPurchases(businessId: string, limit = 50, offset = 0) {
    const data = await db.select()
      .from(purchases)
      .where(eq(purchases.businessId, businessId))
      .limit(limit)
      .offset(offset);

    const [{ count }] = await db.select({ count: sql`count(*)`.mapWith(Number) })
      .from(purchases)
      .where(eq(purchases.businessId, businessId));

    return {
      data,
      meta: { total: count, limit, offset }
    };
  }
}
