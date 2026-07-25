import { eq, and, sql, desc } from 'drizzle-orm';
import { db } from '../../db';
import { customers, sales, payments } from '../../db/schema';
import { AppError } from '../../core/utils/AppError';
import { getCache, setCache, flushPattern } from '../../core/cache/redis';

export class CustomersService {
  public static async invalidateCustomerCache(businessId: string) {
    try {
      await flushPattern(`cache:${businessId}:customers:*`);
      await flushPattern(`cache:${businessId}:*reports*`);
    } catch (err) {
      console.error(`Error invalidating customer/report cache for business ${businessId}:`, err);
    }
  }

  static async getCustomers(businessId: string, filters: { limit?: number; offset?: number; search?: string } = {}) {
    const { limit = 1000, offset = 0, search } = filters;
    const cacheKey = `cache:${businessId}:customers:${limit}:${offset}:${search || 'all'}`;

    // 1. Check Redis Cache first
    try {
      const cached = await getCache(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }
    } catch (err) {
      console.error(`Redis read error on getCustomers for business ${businessId}:`, err);
    }

    // 2. Fetch from Database on cache miss
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
      baseSalary: customers.baseSalary,
      periodOwed: customers.periodOwed,
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

    const result = {
      data,
      meta: { total: count, limit, offset }
    };

    // 3. Store in Redis with 15 minutes TTL
    try {
      await setCache(cacheKey, JSON.stringify(result), 900);
    } catch (err) {
      console.error(`Redis write error on getCustomers for business ${businessId}:`, err);
    }

    return result;
  }

  static async createCustomer(
    businessId: string,
    userId: string,
    data: {
      name: string;
      phone?: string;
      nationalId?: string;
      address?: string;
      notes?: string;
      type?: 'INDIVIDUAL' | 'BUSINESS' | 'EMPLOYEE';
      amountOwed?: number;
      periodOwed?: string;
      baseSalary?: number;
    }
  ) {
    const amountOwed = Number(data.amountOwed || 0);

    const [newCustomer] = await db.insert(customers).values({
      businessId,
      name: data.name,
      phone: data.phone,
      nationalId: data.nationalId,
      address: data.address,
      notes: data.notes,
      type: data.type || 'INDIVIDUAL',
      balance: amountOwed > 0 ? amountOwed.toString() : '0',
      baseSalary: data.baseSalary !== undefined ? data.baseSalary.toString() : '0',
      periodOwed: amountOwed > 0 ? (data.periodOwed || null) : null,
      hasActiveCredit: amountOwed > 0,
      createdBy: userId,
    }).returning();

    await this.invalidateCustomerCache(businessId);
    return newCustomer;
  }

  static async updateCustomer(
    businessId: string,
    customerId: string,
    data: {
      name?: string;
      phone?: string;
      nationalId?: string;
      address?: string;
      notes?: string;
      isActive?: boolean;
      type?: 'INDIVIDUAL' | 'BUSINESS' | 'EMPLOYEE';
      periodOwed?: string;
      amountOwed?: number;
      balance?: string | number;
      baseSalary?: number | string;
    }
  ) {
    const updateData: any = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.phone !== undefined) updateData.phone = data.phone;
    if (data.nationalId !== undefined) updateData.nationalId = data.nationalId;
    if (data.address !== undefined) updateData.address = data.address;
    if (data.notes !== undefined) updateData.notes = data.notes;
    if (data.type !== undefined) updateData.type = data.type;
    if (data.isActive !== undefined) updateData.isActive = data.isActive;
    if (data.periodOwed !== undefined) updateData.periodOwed = data.periodOwed;

    if (data.amountOwed !== undefined) {
      updateData.balance = data.amountOwed.toString();
      updateData.hasActiveCredit = data.amountOwed > 0;
    } else if (data.balance !== undefined) {
      updateData.balance = data.balance.toString();
      updateData.hasActiveCredit = Number(data.balance) > 0;
    }

    if (data.baseSalary !== undefined) {
      updateData.baseSalary = data.baseSalary.toString();
    }

    const [updatedCustomer] = await db.update(customers)
      .set(updateData)
      .where(and(eq(customers.id, customerId), eq(customers.businessId, businessId)))
      .returning();
    
    if (!updatedCustomer) {
      throw new Error('Customer not found');
    }
    
    await this.invalidateCustomerCache(businessId);
    return updatedCustomer;
  }

  static async deleteCustomer(businessId: string, customerId: string) {
    const [deleted] = await db.delete(customers)
      .where(and(eq(customers.id, customerId), eq(customers.businessId, businessId)))
      .returning();

    if (!deleted) {
      throw new Error('Customer not found');
    }

    await this.invalidateCustomerCache(businessId);
    return deleted;
  }

  static async clearAllCustomers(businessId: string) {
    const deletedList = await db.delete(customers)
      .where(eq(customers.businessId, businessId))
      .returning();

    await this.invalidateCustomerCache(businessId);
    return { count: deletedList.length };
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
      const paymentStatusStr = data.amount === balanceNum ? 'completed' : 'partial';

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

      await this.invalidateCustomerCache(businessId);
      return { payment, customer: updatedCustomer };
    });
  }

  static async completeMpesaDebtPayment(
    tx: any,
    paymentId: string,
    customerId: string,
    amount: number,
    mpesaReceiptNumber: string
  ) {
    // 1. Verify customer exists
    const [customer] = await tx.select()
      .from(customers)
      .where(eq(customers.id, customerId));

    if (!customer) {
      throw new Error('Customer not found');
    }

    const balanceNum = Number(customer.balance);
    const newBalance = Math.max(0, balanceNum - amount);
    const paymentStatusStr = amount === balanceNum ? 'completed' : 'partial';

    // 2. Decrease customer balance
    await tx.update(customers)
      .set({
        balance: newBalance.toString(),
        hasActiveCredit: newBalance > 0,
        updatedAt: new Date()
      })
      .where(eq(customers.id, customerId));

    // 3. Allocate payment to customer's outstanding credit sales (FIFO order)
    let remainingAmount = amount;
    const unpaidSales = await tx.select()
      .from(sales)
      .where(and(
        eq(sales.customerId, customerId),
        sql`${sales.paymentStatus} IN ('UNPAID', 'PARTIAL')`
      ))
      .orderBy(sales.soldAt);

    for (const sale of unpaidSales) {
      if (remainingAmount <= 0) break;

      const saleTotal = Number(sale.totalAmount);
      const salePaid = Number(sale.amountPaid);
      const saleDebt = Math.max(0, saleTotal - salePaid);

      if (saleDebt <= 0) continue;

      if (remainingAmount >= saleDebt) {
        await tx.update(sales)
          .set({
            amountPaid: sale.totalAmount,
            paymentStatus: 'PAID',
            mpesaRef: mpesaReceiptNumber.toUpperCase()
          })
          .where(eq(sales.id, sale.id));
        remainingAmount -= saleDebt;
      } else {
        const newPaidAmount = salePaid + remainingAmount;
        await tx.update(sales)
          .set({
            amountPaid: newPaidAmount.toString(),
            paymentStatus: 'PARTIAL',
            mpesaRef: mpesaReceiptNumber.toUpperCase()
          })
          .where(eq(sales.id, sale.id));
        remainingAmount = 0;
      }
    }

    // 4. Update the payment record with notes and receipt number
    await tx.update(payments)
      .set({
        notes: paymentStatusStr,
        mpesaReceiptNumber: mpesaReceiptNumber
      })
      .where(eq(payments.id, paymentId));

    await this.invalidateCustomerCache(customer.businessId);
  }

  static async getCustomerPayments(businessId: string, customerId: string) {
    return await db.select()
      .from(payments)
      .where(and(
        eq(payments.businessId, businessId),
        eq(payments.referenceType, 'CUSTOMER_DEBT'),
        eq(payments.referenceId, customerId),
        eq(payments.status, 'COMPLETED')
      ))
      .orderBy(desc(payments.paidAt));
  }
}
