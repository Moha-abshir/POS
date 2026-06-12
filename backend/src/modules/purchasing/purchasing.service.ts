import { eq, and, sql, inArray } from 'drizzle-orm';
import { db } from '../../db';
import { purchases, purchaseItems, suppliers, payments, products } from '../../db/schema';
import { AppError } from '../../core/utils/AppError';
import { InventoryService } from '../inventory/inventory.service';

export class PurchasingService {
  static async createPurchase(
    businessId: string, 
    userId: string, 
    data: {
      supplierId: string;
      items: { productId: string; quantity: number; costPrice: number }[];
      amountPaid: number;
      paymentMethod: 'CASH' | 'MPESA';
      notes?: string;
    }
  ) {
    return await db.transaction(async (tx) => {
      // 0. Cross-tenant validation
      const [supplier] = await tx.select().from(suppliers).where(and(eq(suppliers.id, data.supplierId), eq(suppliers.businessId, businessId)));
      if (!supplier) throw new AppError('Supplier not found or unauthorized', 404);

      const productIds = Array.from(new Set(data.items.map(item => item.productId)));
      const foundProducts = await tx.select().from(products).where(and(inArray(products.id, productIds), eq(products.businessId, businessId)));
      if (foundProducts.length !== productIds.length) {
        throw new AppError('One or more products not found or unauthorized', 404);
      }

      // 1. Calculate totals
      let totalAmount = 0;
      data.items.forEach(item => {
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
        notes: data.notes,
        createdBy: userId,
      }).returning();

      // 3. Create Purchase Items & Update Inventory
      for (const item of data.items) {
        const subtotal = item.quantity * item.costPrice;
        
        await tx.insert(purchaseItems).values({
          businessId,
          purchaseId: purchase.id,
          productId: item.productId,
          quantity: item.quantity.toString(),
          costPrice: item.costPrice.toString(),
          subtotal: subtotal.toString(),
        });

        // Record stock movement (which updates product baseStockQuantity)
        await InventoryService.recordMovement(tx, businessId, {
          productId: item.productId,
          type: 'PURCHASE',
          quantityChange: item.quantity,
          referenceType: 'PURCHASE',
          referenceId: purchase.id,
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
          createdBy: userId,
        });
      }

      // 5. Update Supplier Balance (if they weren't fully paid, the store owes them)
      const balanceChange = totalAmount - data.amountPaid;
      if (balanceChange !== 0) {
        await tx.update(suppliers)
          .set({ balance: sql`${suppliers.balance} + ${balanceChange}` })
          .where(and(eq(suppliers.id, data.supplierId), eq(suppliers.businessId, businessId)));
      }

      return purchase;
    });
  }

  static async getPurchases(businessId: string, limit = 50, offset = 0) {
    return await db.select()
      .from(purchases)
      .where(eq(purchases.businessId, businessId))
      .limit(limit)
      .offset(offset);
  }
}
