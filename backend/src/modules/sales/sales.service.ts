import { eq, and, sql, desc, gte, lte } from 'drizzle-orm';
import { db } from '../../db';
import { sales, saleItems, stockMovements, productVariants, customers, payments, variantUnits } from '../../db/schema';


export class SalesService {
  static async getSales(businessId: string, filters: { 
    limit?: number; 
    offset?: number; 
    customerId?: string;
    startDate?: string;
    endDate?: string;
    paymentStatus?: 'PAID' | 'PARTIAL' | 'UNPAID';
    paymentMethod?: 'CASH' | 'MPESA';
  } = {}) {
    const { limit = 50, offset = 0, customerId, startDate, endDate, paymentStatus, paymentMethod } = filters;
    
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
      quantity: saleItems.quantity,
      sellingPrice: saleItems.sellingPrice,
      subtotal: saleItems.subtotal,
      variantName: productVariants.name,
      unitName: variantUnits.name,
    })
      .from(saleItems)
      .innerJoin(productVariants, eq(saleItems.variantId, productVariants.id))
      .innerJoin(variantUnits, eq(saleItems.unitId, variantUnits.id))
      .where(eq(saleItems.saleId, saleId));

    return { ...sale, items };
  }

  static async createSale(businessId: string, userId: string, data: {
    customerId?: string;
    items: { variantId: string; unitId: string; quantity: number; sellingPrice: number }[];
    amountPaid: number;
    discountAmount?: number;
    paymentMethod: 'CASH' | 'MPESA';
    mpesaRef?: string;
    mpesaPhoneNumber?: string;
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
    if (paymentStatus !== 'PAID' && !data.customerId) {
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
}
