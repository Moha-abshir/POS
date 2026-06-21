import { eq, and, sql, desc } from 'drizzle-orm';
import { db } from '../../db';
import { customers, sales, payments } from '../../db/schema';
import { AppError } from '../../core/utils/AppError';

export class CustomersService {
  static async getCustomers(businessId: string, filters: { limit?: number; offset?: number; search?: string } = {}) {
    const { limit = 50, offset = 0, search } = filters;
    
    const conditions: any[] = [eq(customers.businessId, businessId)];
    
    if (search) {
      conditions.push(sql`${customers.name} ILIKE ${`%${search}%`} OR ${customers.phone} ILIKE ${`%${search}%`}`);
    }

    const data = await db.select({
      id: customers.id,
      businessId: customers.businessId,
      name: customers.name,
      phone: customers.phone,
      nationalId: customers.nationalId,
      address: customers.address,
      notes: customers.notes,
      type: customers.type,
      balance: customers.balance,
      hasActiveCredit: customers.hasActiveCredit,
      isActive: customers.isActive,
      createdAt: customers.createdAt,
      updatedAt: customers.updatedAt,
      createdBy: customers.createdBy,
      purchaseCount: sql<number>`count(${sales.id})`.mapWith(Number),
      lastPurchaseDate: sql<Date | null>`max(${sales.soldAt})`
    })
      .from(customers)
      .leftJoin(sales, eq(customers.id, sales.customerId))
      .where(and(...conditions))
      .groupBy(customers.id)
      .orderBy(desc(customers.createdAt))
      .limit(limit)
      .offset(offset);

    const [{ count }] = await db.select({ count: sql`count(*)`.mapWith(Number) })
      .from(customers)
      .where(and(...conditions));

    return {
      data,
      meta: { total: count, limit, offset }
    };
  }

  static async createCustomer(businessId: string, userId: string, data: { name: string; phone?: string; nationalId?: string; address?: string; notes?: string; type?: 'INDIVIDUAL' | 'BUSINESS' }) {
    const [newCustomer] = await db.insert(customers).values({
      businessId,
      name: data.name,
      phone: data.phone,
      nationalId: data.nationalId,
      address: data.address,
      notes: data.notes,
      type: data.type || 'INDIVIDUAL',
      createdBy: userId,
    }).returning();
    return newCustomer;
  }

  static async updateCustomer(businessId: string, customerId: string, data: { name?: string; phone?: string; nationalId?: string; address?: string; notes?: string; isActive?: boolean; type?: 'INDIVIDUAL' | 'BUSINESS' }) {
    const [updatedCustomer] = await db.update(customers)
      .set(data)
      .where(and(eq(customers.id, customerId), eq(customers.businessId, businessId)))
      .returning();
    
    if (!updatedCustomer) {
      throw new Error('Customer not found');
    }
    
    return updatedCustomer;
  }

  static async getCustomerPurchases(businessId: string, customerId: string) {
    return await db.select()
      .from(sales)
      .where(and(
        eq(sales.businessId, businessId),
        eq(sales.customerId, customerId)
      ))
      .orderBy(desc(sales.soldAt));
  }

  static async recordPayment(
    businessId: string,
    userId: string,
    customerId: string,
    data: { amount: number; method: 'CASH' | 'MPESA'; mpesaReceiptNumber?: string }
  ) {
    if (data.amount <= 0) throw new AppError('Payment amount must be greater than zero', 400);

    return await db.transaction(async (tx) => {
      // 1. Verify customer exists and has outstanding balance
      const [customer] = await tx.select()
        .from(customers)
        .where(and(eq(customers.id, customerId), eq(customers.businessId, businessId)));

      if (!customer) {
        throw new AppError('Customer not found', 404);
      }

      const balanceNum = Number(customer.balance);
      if (balanceNum < data.amount) {
        throw new AppError(`Payment amount (${data.amount}) exceeds outstanding balance (${customer.balance})`, 400);
      }

      const newBalance = balanceNum - data.amount;
      const paymentStatusStr = data.amount === balanceNum ? 'Completed' : 'Partial';

      // 2. Decrease balance
      const [updatedCustomer] = await tx.update(customers)
        .set({
          balance: newBalance.toString(),
          hasActiveCredit: newBalance > 0,
          updatedAt: new Date()
        })
        .where(eq(customers.id, customerId))
        .returning();

      // 3. Allocate payment to customer's outstanding credit sales (FIFO order)
      let remainingAmount = data.amount;
      
      // Fetch all credit sales for this customer that are not fully paid
      const unpaidSales = await tx.select()
        .from(sales)
        .where(and(
          eq(sales.businessId, businessId),
          eq(sales.customerId, customerId),
          sql`${sales.paymentStatus} IN ('UNPAID', 'PARTIAL')`
        ))
        .orderBy(sales.soldAt); // Oldest first (FIFO)

      for (const sale of unpaidSales) {
        if (remainingAmount <= 0) break;

        const saleTotal = Number(sale.totalAmount);
        const salePaid = Number(sale.amountPaid);
        const saleDebt = Math.max(0, saleTotal - salePaid);

        if (saleDebt <= 0) continue;

        if (remainingAmount >= saleDebt) {
          // Fully pay off this sale
          await tx.update(sales)
            .set({
              amountPaid: sale.totalAmount,
              paymentStatus: 'PAID',
              mpesaRef: data.method === 'MPESA' && data.mpesaReceiptNumber ? data.mpesaReceiptNumber.toUpperCase() : sale.mpesaRef
            })
            .where(eq(sales.id, sale.id));
          
          remainingAmount -= saleDebt;
        } else {
          // Partially pay off this sale
          const newPaidAmount = salePaid + remainingAmount;
          await tx.update(sales)
            .set({
              amountPaid: newPaidAmount.toString(),
              paymentStatus: 'PARTIAL',
              mpesaRef: data.method === 'MPESA' && data.mpesaReceiptNumber ? data.mpesaReceiptNumber.toUpperCase() : sale.mpesaRef
            })
            .where(eq(sales.id, sale.id));
          
          remainingAmount = 0;
        }
      }

      // 4. Create payment record
      const [payment] = await tx.insert(payments).values({
        businessId,
        referenceType: 'CUSTOMER_DEBT',
        referenceId: customerId,
        amount: data.amount.toString(),
        method: data.method,
        mpesaReceiptNumber: data.method === 'MPESA' && data.mpesaReceiptNumber ? data.mpesaReceiptNumber.toUpperCase() : null,
        notes: paymentStatusStr,
        createdBy: userId,
      }).returning();

      return { payment, customer: updatedCustomer };
    });
  }

  static async getCustomerPayments(businessId: string, customerId: string) {
    return await db.select()
      .from(payments)
      .where(and(
        eq(payments.businessId, businessId),
        eq(payments.referenceType, 'CUSTOMER_DEBT'),
        eq(payments.referenceId, customerId)
      ))
      .orderBy(desc(payments.paidAt));
  }
}
