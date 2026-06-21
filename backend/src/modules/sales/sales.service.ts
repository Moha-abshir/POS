import { eq, and, sql, desc, gte, lte, ilike, inArray } from 'drizzle-orm';
import { db } from '../../db';
import { sales, saleItems, stockMovements, productVariants, customers, payments, variantUnits, products, refunds, refundItems } from '../../db/schema';
import { AppError } from '../../core/utils/AppError';
import { InventoryService } from '../inventory/inventory.service';


export class SalesService {
  static async getSales(businessId: string, filters: { 
    limit?: number; 
    offset?: number; 
    customerId?: string;
    startDate?: string;
    endDate?: string;
    paymentStatus?: 'PAID' | 'PARTIAL' | 'UNPAID';
    paymentMethod?: 'CASH' | 'MPESA';
    mpesaRef?: string;
  } = {}) {
    const { limit = 50, offset = 0, customerId, startDate, endDate, paymentStatus, paymentMethod, mpesaRef } = filters;
    
    const conditions: any[] = [eq(sales.businessId, businessId)];
    if (customerId) {
      conditions.push(eq(sales.customerId, customerId));
    }
    if (startDate) {
      conditions.push(gte(sales.soldAt, new Date(startDate)));
    }
    if (endDate) {
      conditions.push(lte(sales.soldAt, new Date(endDate)));
    }
    if (paymentStatus) {
      conditions.push(eq(sales.paymentStatus, paymentStatus));
    }
    if (paymentMethod) {
      conditions.push(eq(sales.paymentMethod, paymentMethod));
    }
    if (mpesaRef) {
      conditions.push(ilike(sales.mpesaRef, `%${mpesaRef}%`));
    }

    const data = await db.select({
      id: sales.id,
      totalAmount: sales.totalAmount,
      amountPaid: sales.amountPaid,
      paymentStatus: sales.paymentStatus,
      paymentMethod: sales.paymentMethod,
      mpesaRef: sales.mpesaRef,
      soldAt: sales.soldAt,
      customerName: customers.name,
    })
      .from(sales)
      .leftJoin(customers, eq(sales.customerId, customers.id))
      .where(and(...conditions))
      .orderBy(desc(sales.soldAt))
      .limit(limit)
      .offset(offset);

    const [{ count }] = await db.select({ count: sql`count(*)`.mapWith(Number) })
      .from(sales)
      .where(and(...conditions));

    return {
      data,
      meta: { total: count, limit, offset }
    };
  }

  static async getSaleDetails(businessId: string, saleId: string) {
    const [sale] = await db.select({
      id: sales.id,
      totalAmount: sales.totalAmount,
      amountPaid: sales.amountPaid,
      discountAmount: sales.discountAmount,
      paymentStatus: sales.paymentStatus,
      paymentMethod: sales.paymentMethod,
      mpesaRef: sales.mpesaRef,
      soldAt: sales.soldAt,
      customerName: customers.name,
      customerPhone: customers.phone,
    })
      .from(sales)
      .leftJoin(customers, eq(sales.customerId, customers.id))
      .where(and(eq(sales.id, saleId), eq(sales.businessId, businessId)));

    if (!sale) return null;

    const items = await db.select({
      id: saleItems.id,
      variantId: saleItems.variantId,
      unitId: saleItems.unitId,
      quantity: saleItems.quantity,
      sellingPrice: saleItems.sellingPrice,
      subtotal: saleItems.subtotal,
      variantName: productVariants.name,
      productName: products.name,
      unitName: variantUnits.name,
    })
      .from(saleItems)
      .innerJoin(productVariants, eq(saleItems.variantId, productVariants.id))
      .innerJoin(products, eq(productVariants.productId, products.id))
      .innerJoin(variantUnits, eq(saleItems.unitId, variantUnits.id))
      .where(eq(saleItems.saleId, saleId));

    // Fetch existing refunds for this sale
    const saleRefunds = await db.select({
      id: refunds.id,
      totalAmount: refunds.totalAmount,
      reason: refunds.reason,
      refundedAt: refunds.refundedAt,
    })
      .from(refunds)
      .where(and(eq(refunds.saleId, saleId), eq(refunds.businessId, businessId)));

    // Fetch items for each refund
    const refundIds = saleRefunds.map(r => r.id);
    let refundedItems: any[] = [];
    if (refundIds.length > 0) {
      refundedItems = await db.select({
        id: refundItems.id,
        refundId: refundItems.refundId,
        variantId: refundItems.variantId,
        unitId: refundItems.unitId,
        quantity: refundItems.quantity,
        unitPrice: refundItems.unitPrice,
        subtotal: refundItems.subtotal,
      })
        .from(refundItems)
        .where(and(inArray(refundItems.refundId, refundIds), eq(refundItems.businessId, businessId)));
    }

    const refundsWithItems = saleRefunds.map(r => ({
      ...r,
      items: refundedItems.filter(item => item.refundId === r.id)
    }));

    return { ...sale, items, refunds: refundsWithItems };
  }

  static async createSale(businessId: string, userId: string, data: {
    customerId?: string;
    items: { variantId: string; unitId: string; quantity: number; sellingPrice: number }[];
    amountPaid: number;
    discountAmount?: number;
    paymentMethod: 'CASH' | 'MPESA';
    mpesaRef?: string;
    mpesaPhoneNumber?: string;
    isStkPush?: boolean;
  }) {
    // Calculate totals
    const subtotal = data.items.reduce((sum, item) => sum + (item.quantity * item.sellingPrice), 0);
    const discountAmount = data.discountAmount || 0;
    const totalAmount = Math.max(0, subtotal - discountAmount);
    
    // Determine payment status
    let paymentStatus: 'PAID' | 'PARTIAL' | 'UNPAID' = 'UNPAID';
    if (data.amountPaid >= totalAmount) {
      paymentStatus = 'PAID';
    } else if (data.amountPaid > 0) {
      paymentStatus = 'PARTIAL';
    }

    // Validation
    if (paymentStatus !== 'PAID' && !data.customerId && !data.isStkPush) {
      throw new Error('Customer must be provided for credit or partial sales');
    }

    return await db.transaction(async (tx) => {
      // 1. Create Sale Record
      const [newSale] = await tx.insert(sales).values({
        businessId,
        customerId: data.customerId || null,
        totalAmount: totalAmount.toString(),
        discountAmount: discountAmount.toString(),
        amountPaid: data.amountPaid.toString(),
        paymentStatus,
        paymentMethod: data.paymentMethod,
        mpesaRef: data.mpesaRef,
        mpesaPhoneNumber: data.mpesaPhoneNumber,
        createdBy: userId,
      }).returning();

      // 2. Create Sale Items & Deduct Inventory
      for (const item of data.items) {
        
        // Fetch the unit to get the conversion factor
        const [unit] = await tx.select({ conversionFactor: variantUnits.conversionFactor })
          .from(variantUnits)
          .where(eq(variantUnits.id, item.unitId));
          
        if (!unit) {
          throw new Error(`Unit not found for id ${item.unitId}`);
        }

        const conversionFactor = Number(unit.conversionFactor);
        const deductionAmount = item.quantity * conversionFactor;

        // Insert sale item
        await tx.insert(saleItems).values({
          businessId,
          saleId: newSale.id,
          variantId: item.variantId,
          unitId: item.unitId,
          quantity: item.quantity.toString(),
          sellingPrice: item.sellingPrice.toString(),
          subtotal: (item.quantity * item.sellingPrice).toString(),
        });

        // Insert stock movement
        await tx.insert(stockMovements).values({
          businessId,
          variantId: item.variantId,
          type: 'SALE',
          quantityChange: (-deductionAmount).toString(), // Negative for sale
          referenceType: 'SALE',
          referenceId: newSale.id,
          notes: 'Product sale',
          createdBy: userId,
        });

        // Update variant base stock
        await tx.update(productVariants)
          .set({
            baseStockQuantity: sql`${productVariants.baseStockQuantity} - ${deductionAmount}`,
            updatedAt: new Date()
          })
          .where(and(eq(productVariants.id, item.variantId), eq(productVariants.businessId, businessId)));
      }

      // 3. Update Customer Balance (If credit sale)
      if (data.customerId && paymentStatus !== 'PAID') {
        const debtAmount = totalAmount - data.amountPaid;
        await tx.update(customers)
          .set({
            balance: sql`${customers.balance} + ${debtAmount}`,
            hasActiveCredit: true,
            updatedAt: new Date()
          })
          .where(and(eq(customers.id, data.customerId), eq(customers.businessId, businessId)));
      }

      // 4. Record Payment (If any amount was paid)
      if (data.amountPaid > 0) {
        await tx.insert(payments).values({
          businessId,
          referenceType: 'SALE',
          referenceId: newSale.id,
          amount: data.amountPaid.toString(),
          method: data.paymentMethod,
          createdBy: userId,
        });
      }

      return newSale;
    });
  }

  static async deleteFailedSale(saleId: string) {
    return await db.transaction(async (tx) => {
      // Get the sale
      const [sale] = await tx.select().from(sales).where(eq(sales.id, saleId));
      if (!sale) return;

      // Get sale items
      const items = await tx.select().from(saleItems).where(eq(saleItems.saleId, saleId));

      // Revert product variants inventory
      for (const item of items) {
        const [unit] = await tx.select({ conversionFactor: variantUnits.conversionFactor })
          .from(variantUnits)
          .where(eq(variantUnits.id, item.unitId));

        if (unit) {
          const conversionFactor = Number(unit.conversionFactor);
          const deductionAmount = Number(item.quantity) * conversionFactor;

          // Revert base stock
          await tx.update(productVariants)
            .set({
              baseStockQuantity: sql`${productVariants.baseStockQuantity} + ${deductionAmount}`,
              updatedAt: new Date()
            })
            .where(eq(productVariants.id, item.variantId));
        }
      }

      // Delete stock movements
      await tx.delete(stockMovements)
        .where(and(
          eq(stockMovements.referenceType, 'SALE'),
          eq(stockMovements.referenceId, saleId)
        ));

      // Revert customer balance if it was a credit sale (unpaid)
      if (sale.customerId && sale.paymentStatus === 'UNPAID') {
        const debtAmount = Number(sale.totalAmount) - Number(sale.amountPaid);
        await tx.update(customers)
          .set({
            balance: sql`${customers.balance} - ${debtAmount}`,
            updatedAt: new Date()
          })
          .where(eq(customers.id, sale.customerId));
      }

      // Delete sale items
      await tx.delete(saleItems).where(eq(saleItems.saleId, saleId));

      // Delete the payment records linked to this sale
      await tx.delete(payments).where(and(eq(payments.referenceType, 'SALE'), eq(payments.referenceId, saleId)));

      // Delete the sale record itself
      await tx.delete(sales).where(eq(sales.id, saleId));
    });
  }

  static async refundSale(
    businessId: string,
    userId: string,
    saleId: string,
    data: {
      reason?: string;
      items: {
        variantId: string;
        unitId: string;
        quantity: number;
      }[];
    }
  ) {
    return await db.transaction(async (tx) => {
      // 1. Fetch sale
      const [sale] = await tx.select()
        .from(sales)
        .where(and(eq(sales.id, saleId), eq(sales.businessId, businessId)));

      if (!sale) {
        throw new AppError('Sale not found', 404);
      }

      // 2. Fetch sale items
      const saleItemsList = await tx.select()
        .from(saleItems)
        .where(and(eq(saleItems.saleId, saleId), eq(saleItems.businessId, businessId)));

      // 3. Fetch existing refunds for this sale
      const existingRefunds = await tx.select({
        variantId: refundItems.variantId,
        unitId: refundItems.unitId,
        quantity: refundItems.quantity,
      })
        .from(refundItems)
        .innerJoin(refunds, eq(refundItems.refundId, refunds.id))
        .where(and(eq(refunds.saleId, saleId), eq(refunds.businessId, businessId)));

      // Helper to count previously refunded qty for a variant/unit combination
      const getPrevRefundedQty = (variantId: string, unitId: string) => {
        return existingRefunds
          .filter(r => r.variantId === variantId && r.unitId === unitId)
          .reduce((sum, r) => sum + Number(r.quantity), 0);
      };

      let refundTotal = 0;
      const refundItemsToInsert: any[] = [];

      // 4. Validate each refund item
      for (const refundItem of data.items) {
        const originalItem = saleItemsList.find(
          si => si.variantId === refundItem.variantId && si.unitId === refundItem.unitId
        );

        if (!originalItem) {
          throw new AppError(`Item was not purchased in this sale`, 400);
        }

        const prevRefunded = getPrevRefundedQty(refundItem.variantId, refundItem.unitId);
        const maxReturnable = Number(originalItem.quantity) - prevRefunded;

        if (refundItem.quantity <= 0) {
          throw new AppError(`Quantity to refund must be greater than 0`, 400);
        }

        if (refundItem.quantity > maxReturnable) {
          throw new AppError(
            `Cannot refund ${refundItem.quantity} unit(s). Only ${maxReturnable} unit(s) remaining.`,
            400
          );
        }

        // Fetch unit details to obtain the conversion factor for correct base stock recalculation
        const [unit] = await tx.select()
          .from(variantUnits)
          .where(and(eq(variantUnits.id, refundItem.unitId), eq(variantUnits.businessId, businessId)));

        if (!unit) {
          throw new AppError(`Unit not found for the refunded item`, 404);
        }

        const conversionFactor = Number(unit.conversionFactor);
        const unitPrice = Number(originalItem.sellingPrice);
        const subtotal = refundItem.quantity * unitPrice;
        refundTotal += subtotal;

        refundItemsToInsert.push({
          businessId,
          variantId: refundItem.variantId,
          unitId: refundItem.unitId,
          quantity: refundItem.quantity.toString(),
          unitPrice: unitPrice.toString(),
          subtotal: subtotal.toString(),
          conversionFactor,
        });
      }

      if (refundTotal <= 0) {
        throw new AppError('No items selected for refund', 400);
      }

      // 5. Create refund record
      const [refundRecord] = await tx.insert(refunds).values({
        businessId,
        saleId,
        totalAmount: refundTotal.toString(),
        reason: data.reason || null,
        createdBy: userId,
      }).returning();

      // 6. Create refund items and log stock movements
      for (const item of refundItemsToInsert) {
        await tx.insert(refundItems).values({
          businessId: item.businessId,
          refundId: refundRecord.id,
          variantId: item.variantId,
          unitId: item.unitId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          subtotal: item.subtotal,
        });

        const quantityChange = Number(item.quantity) * item.conversionFactor;

        // Log refund stock movement (this increases inventory in base units)
        await InventoryService.recordMovement(tx, businessId, {
          variantId: item.variantId,
          type: 'REFUND',
          quantityChange: quantityChange,
          referenceType: 'REFUND',
          referenceId: refundRecord.id,
          notes: `Refund for sale #${saleId.slice(0, 8).toUpperCase()}${data.reason ? `: ${data.reason}` : ''}`,
          userId,
        });
      }

      // 7. Adjust customer balance if credit sale
      const totalAmount = Number(sale.totalAmount);
      const amountPaid = Number(sale.amountPaid);
      const currentDebt = Math.max(0, totalAmount - amountPaid);

      if (sale.customerId && currentDebt > 0) {
        const debtReduction = Math.min(refundTotal, currentDebt);
        await tx.update(customers)
          .set({
            balance: sql`${customers.balance} - ${debtReduction}`,
            updatedAt: new Date()
          })
          .where(and(eq(customers.id, sale.customerId), eq(customers.businessId, businessId)));
      }

      return refundRecord;
    });
  }
}
