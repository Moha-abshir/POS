import { eq, and, sql, desc, inArray } from 'drizzle-orm';
import { db } from '../../db';
import { customers, sales, saleItems, payments, bankingTransactions, refunds, stockMovements, users } from '../../db/schema';
import { AppError } from '../../core/utils/AppError';
import { getCache, setCache, flushPattern } from '../../core/cache/redis';

export class CustomersService {
  public static async invalidateCustomerCache(businessId: string) {
    try {
      await flushPattern(`cache:${businessId}:*customers*`);
      await flushPattern(`cache:${businessId}:*reports*`);
    } catch (err) {
      console.error(`Error invalidating customer/report cache for business ${businessId}:`, err);
    }
  }

  static async syncEmployeeCustomers(businessId: string) {
    try {
      const businessUsers = await db.select().from(users).where(and(eq(users.businessId, businessId), eq(users.isActive, true)));
      for (const u of businessUsers) {
        if (u.role === 'OWNER') continue; // Skip creating employee customer accounts for business owners
        const cleanFirst = (u.firstName || '').trim();
        const cleanLast = (u.lastName || '').trim();
        const fullName = `${cleanFirst} ${cleanLast}`.trim() || u.email;
        if (!fullName) continue;

        const [existing] = await db.select().from(customers)
          .where(and(
            eq(customers.businessId, businessId),
            sql`LOWER(TRIM(${customers.name})) = LOWER(TRIM(${fullName}))`
          ));

        if (!existing) {
          await db.insert(customers).values({
            businessId,
            name: fullName,
            phone: u.mobileNumber || undefined,
            notes: `System User (${u.email})`,
            type: 'EMPLOYEE',
          }).catch(() => {});
        }
      }
    } catch (err) {
      console.error('Error syncing employee customers:', err);
    }
  }

  static async getCustomers(businessId: string, filters: { limit?: number; offset?: number; search?: string } = {}) {
    await this.syncEmployeeCustomers(businessId);

    const { limit = 1000, offset = 0, search } = filters;
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
      additionalSavings: customers.additionalSavings,
      lastSalarySettledAt: customers.lastSalarySettledAt,
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

    return {
      data,
      meta: { total: count, limit, offset }
    };
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
      balance: amountOwed !== 0 ? amountOwed.toString() : '0',
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
    return await db.transaction(async (tx) => {
      // 1. Delete associated payments
      await tx.delete(payments)
        .where(and(
          eq(payments.businessId, businessId),
          eq(payments.referenceId, customerId)
        ));

      // 2. Fetch sales for this customer to delete associated records
      const customerSales = await tx.select({ id: sales.id })
        .from(sales)
        .where(and(eq(sales.businessId, businessId), eq(sales.customerId, customerId)));

      const saleIds = customerSales.map(s => s.id);
      if (saleIds.length > 0) {
        // Delete sale items
        await tx.delete(saleItems)
          .where(and(eq(saleItems.businessId, businessId), inArray(saleItems.saleId, saleIds)));

        // Delete refunds
        await tx.delete(refunds)
          .where(and(eq(refunds.businessId, businessId), inArray(refunds.saleId, saleIds)));

        // Delete stock movements
        await tx.delete(stockMovements)
          .where(and(eq(stockMovements.businessId, businessId), inArray(stockMovements.referenceId, saleIds)));

        // Delete sales payments
        await tx.delete(payments)
          .where(and(eq(payments.businessId, businessId), inArray(payments.referenceId, saleIds)));

        // Delete sales
        await tx.delete(sales)
          .where(and(eq(sales.businessId, businessId), eq(sales.customerId, customerId)));
      }

      // 3. Delete customer
      const [deleted] = await tx.delete(customers)
        .where(and(eq(customers.id, customerId), eq(customers.businessId, businessId)))
        .returning();

      if (!deleted) {
        throw new AppError('Customer not found', 404);
      }

      await this.invalidateCustomerCache(businessId);
      return deleted;
    });
  }

  static async clearAllCustomers(businessId: string) {
    const deletedList = await db.delete(customers)
      .where(eq(customers.businessId, businessId))
      .returning();

    await this.invalidateCustomerCache(businessId);
    return { count: deletedList.length };
  }

  static async getCustomerPurchases(businessId: string, customerId: string) {
    const [customer] = await db.select({
      id: customers.id,
      type: customers.type,
      lastSalarySettledAt: customers.lastSalarySettledAt,
    }).from(customers).where(and(eq(customers.id, customerId), eq(customers.businessId, businessId)));

    const customerSales = await db.select()
      .from(sales)
      .where(and(
        eq(sales.businessId, businessId),
        eq(sales.customerId, customerId)
      ))
      .orderBy(desc(sales.soldAt));

    const settledAtTime = customer?.lastSalarySettledAt ? new Date(customer.lastSalarySettledAt).getTime() : null;

    const salesWithRefunds = await Promise.all(customerSales.map(async (sale) => {
      const saleRefunds = await db.select({
        id: refunds.id,
        totalAmount: refunds.totalAmount,
        reason: refunds.reason,
        refundedAt: refunds.refundedAt,
      })
      .from(refunds)
      .where(and(eq(refunds.saleId, sale.id), eq(refunds.businessId, businessId)));

      const saleTime = new Date(sale.soldAt).getTime();
      const isPriorCycle = settledAtTime ? saleTime <= settledAtTime : false;

      return { ...sale, refunds: saleRefunds, isPriorCycle };
    }));

    return salesWithRefunds;
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
      const newBalance = balanceNum - data.amount;
      const paymentStatusStr = newBalance <= 0 ? 'completed' : 'partial';

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
      return { 
        payment, 
        customer: updatedCustomer,
        previousBalance: balanceNum,
        amountPaid: data.amount,
        newBalance
      };
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
    const newBalance = balanceNum - amount;
    const paymentStatusStr = newBalance <= 0 ? 'completed' : 'partial';

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

  static async recordEmployeePayout(
    businessId: string,
    userId: string,
    employeeId: string,
    data: { amount: number; method: 'CASH' | 'MPESA'; mpesaReceiptNumber?: string; notes?: string }
  ) {
    return await db.transaction(async (tx) => {
      const [customer] = await tx.select()
        .from(customers)
        .where(and(eq(customers.id, employeeId), eq(customers.businessId, businessId)));

      if (!customer) {
        throw new AppError('Employee not found', 404);
      }
      if (customer.type !== 'EMPLOYEE') {
        throw new AppError('Customer is not an employee', 400);
      }

      const baseSalary = Number(customer.baseSalary || 0);
      const additionalSavings = Number(customer.additionalSavings || 0);
      const currentDeductions = Number(customer.balance || 0);
      const prevNetSalary = -( (baseSalary + additionalSavings) - currentDeductions );

      const newDeductions = currentDeductions + data.amount;
      const newNetSalary = -( (baseSalary + additionalSavings) - newDeductions );

      const [updatedCustomer] = await tx.update(customers)
        .set({
          balance: newDeductions.toString(),
          hasActiveCredit: newDeductions > 0,
          updatedAt: new Date()
        })
        .where(eq(customers.id, employeeId))
        .returning();

      const [payment] = await tx.insert(payments).values({
        businessId,
        referenceType: 'EMPLOYEE_SALARY',
        referenceId: employeeId,
        amount: data.amount.toString(),
        method: data.method,
        mpesaReceiptNumber: data.method === 'MPESA' && data.mpesaReceiptNumber ? data.mpesaReceiptNumber.toUpperCase() : null,
        notes: data.notes || 'Salary Payout / Advance',
        createdBy: userId,
      }).returning();

      await this.invalidateCustomerCache(businessId);

      return {
        payment,
        customer: {
          ...updatedCustomer,
          balance: currentDeductions.toString(),
          additionalSavings: additionalSavings.toString()
        },
        goodsTaken: currentDeductions,
        previousBalance: prevNetSalary,
        amountPaid: data.amount,
        newBalance: newNetSalary,
        type: 'PAYOUT'
      };
    });
  }

  static async settleEmployeeSalary(
    businessId: string,
    userId: string,
    employeeId: string,
    data: { amount: number; method: 'CASH' | 'MPESA'; mpesaReceiptNumber?: string; notes?: string }
  ) {
    return await db.transaction(async (tx) => {
      const [customer] = await tx.select()
        .from(customers)
        .where(and(eq(customers.id, employeeId), eq(customers.businessId, businessId)));

      if (!customer) {
        throw new AppError('Employee not found', 404);
      }
      if (customer.type !== 'EMPLOYEE') {
        throw new AppError('Customer is not an employee', 400);
      }

      const baseSalary = Number(customer.baseSalary || 0);
      const additionalSavings = Number(customer.additionalSavings || 0);
      const currentDeductions = Number(customer.balance || 0);
      const grossEntitlement = baseSalary + additionalSavings;
      const netPayable = grossEntitlement - currentDeductions;
      const prevNetSalary = -( netPayable );

      // Settlement payout & carry-over calculation:
      // data.amount is the cash/mpesa paid out to the employee now.
      // remainingEntitlement carries over into the next cycle as savings/credit
      const remainingEntitlement = netPayable - data.amount;

      let newAdditionalSavings = 0;
      let newDeductions = 0;

      if (remainingEntitlement > 0) {
        // Employee has leftover unpaid balance / savings to carry over
        newAdditionalSavings = remainingEntitlement;
        newDeductions = 0;
      } else if (remainingEntitlement < 0) {
        // Employee took more advances / goods taken than total entitlement
        newAdditionalSavings = 0;
        newDeductions = Math.abs(remainingEntitlement);
      } else {
        // Exactly paid in full
        newAdditionalSavings = 0;
        newDeductions = 0;
      }

      const settlementDate = new Date();

      // Mark all unpaid/partial credit sales up to settlementDate as PAID (settled against salary)
      await tx.update(sales)
        .set({
          amountPaid: sales.totalAmount,
          paymentStatus: 'PAID',
        })
        .where(and(
          eq(sales.businessId, businessId),
          eq(sales.customerId, employeeId),
          sql`${sales.paymentStatus} IN ('UNPAID', 'PARTIAL')`
        ));

      // Reset customer balance to newDeductions, additionalSavings to newAdditionalSavings, and record lastSalarySettledAt
      const [updatedCustomer] = await tx.update(customers)
        .set({
          balance: newDeductions.toString(),
          additionalSavings: newAdditionalSavings.toString(),
          hasActiveCredit: newDeductions > 0,
          lastSalarySettledAt: settlementDate,
          updatedAt: settlementDate
        })
        .where(eq(customers.id, employeeId))
        .returning();

      // Record settlement payment if amount > 0
      let payment: any = null;
      if (data.amount > 0) {
        const [p] = await tx.insert(payments).values({
          businessId,
          referenceType: 'EMPLOYEE_SALARY',
          referenceId: employeeId,
          amount: data.amount.toString(),
          method: data.method,
          mpesaReceiptNumber: data.method === 'MPESA' && data.mpesaReceiptNumber ? data.mpesaReceiptNumber.toUpperCase() : null,
          notes: data.notes || 'Full Salary Settlement & Pay Cycle Close',
          createdBy: userId,
          paidAt: settlementDate
        }).returning();
        payment = p;
      }

      await this.invalidateCustomerCache(businessId);

      const newNetSalary = -( newAdditionalSavings - newDeductions );

      return {
        payment: payment || {
          id: 'SETTLED',
          amount: data.amount,
          method: data.method,
          notes: data.notes || 'Full Salary Settlement & Pay Cycle Close',
          paidAt: settlementDate
        },
        customer: {
          ...updatedCustomer,
          balance: currentDeductions.toString(),
          additionalSavings: additionalSavings.toString()
        },
        goodsTaken: currentDeductions,
        previousBalance: prevNetSalary,
        amountPaid: data.amount,
        newBalance: newNetSalary,
        type: 'SETTLEMENT'
      };
    });
  }

  static async recordEmployeeDeposit(
    businessId: string,
    userId: string,
    employeeId: string,
    data: { amount: number; method: 'CASH' | 'MPESA'; mpesaReceiptNumber?: string; notes?: string }
  ) {
    return await db.transaction(async (tx) => {
      const [customer] = await tx.select()
        .from(customers)
        .where(and(eq(customers.id, employeeId), eq(customers.businessId, businessId)));

      if (!customer) {
        throw new AppError('Employee not found', 404);
      }
      if (customer.type !== 'EMPLOYEE') {
        throw new AppError('Customer is not an employee', 400);
      }

      const baseSalary = Number(customer.baseSalary || 0);
      const currentSavings = Number(customer.additionalSavings || 0);
      const currentDeductions = Number(customer.balance || 0);
      const prevNetSalary = -( (baseSalary + currentSavings) - currentDeductions );

      const newSavings = currentSavings + data.amount;
      const newNetSalary = -( (baseSalary + newSavings) - currentDeductions );

      const [updatedCustomer] = await tx.update(customers)
        .set({
          additionalSavings: newSavings.toString(),
          updatedAt: new Date()
        })
        .where(eq(customers.id, employeeId))
        .returning();

      const [payment] = await tx.insert(payments).values({
        businessId,
        referenceType: 'EMPLOYEE_DEPOSIT',
        referenceId: employeeId,
        amount: data.amount.toString(),
        method: data.method,
        mpesaReceiptNumber: data.method === 'MPESA' && data.mpesaReceiptNumber ? data.mpesaReceiptNumber.toUpperCase() : null,
        notes: data.notes || 'Employee Personal Savings Deposit',
        createdBy: userId,
      }).returning();

      await this.invalidateCustomerCache(businessId);

      return {
        payment,
        customer: {
          ...updatedCustomer,
          balance: currentDeductions.toString(),
          additionalSavings: newSavings.toString()
        },
        goodsTaken: currentDeductions,
        previousBalance: prevNetSalary,
        amountPaid: data.amount,
        newBalance: newNetSalary,
        type: 'DEPOSIT'
      };
    });
  }

  static async getCustomerPayments(businessId: string, customerId: string) {
    return await db.select()
      .from(payments)
      .where(and(
        eq(payments.businessId, businessId),
        inArray(payments.referenceType, ['CUSTOMER_DEBT', 'EMPLOYEE_SALARY', 'EMPLOYEE_DEPOSIT']),
        eq(payments.referenceId, customerId),
        eq(payments.status, 'COMPLETED')
      ))
      .orderBy(desc(payments.paidAt));
  }

  static async getCustomerLedger(businessId: string, customerId: string) {
    const salesList = await db.select().from(sales).where(and(eq(sales.businessId, businessId), eq(sales.customerId, customerId)));
    const saleIds = salesList.map(s => s.id);
    
    let salePaymentsList: any[] = [];
    if (saleIds.length > 0) {
      salePaymentsList = await db.select().from(payments).where(and(
        eq(payments.businessId, businessId), 
        eq(payments.referenceType, 'SALE'), 
        inArray(payments.referenceId, saleIds),
        eq(payments.status, 'COMPLETED')
      ));
    }

    const debtPaymentsList = await db.select().from(payments).where(and(
      eq(payments.businessId, businessId), 
      inArray(payments.referenceType, ['CUSTOMER_DEBT', 'EMPLOYEE_SALARY', 'EMPLOYEE_DEPOSIT']), 
      eq(payments.referenceId, customerId), 
      eq(payments.status, 'COMPLETED')
    ));

    const ledger: any[] = [];
    
    salesList.forEach(s => {
      const sp = salePaymentsList.filter(p => p.referenceId === s.id);
      const initialAmountPaid = sp.reduce((sum, p) => sum + Number(p.amount), 0);
      const debt = Number(s.totalAmount) - initialAmountPaid;
      
      if (debt > 0) {
        ledger.push({
          id: s.id,
          date: s.soldAt,
          transNo: s.id.substring(0, 8).toUpperCase(),
          description: 'Credit Sale',
          debtIncrease: debt,
          payment: 0,
        });
      }
    });

    debtPaymentsList.forEach(p => {
      let desc = 'Debt Payment';
      if (p.referenceType === 'EMPLOYEE_SALARY') desc = 'Salary Payout / Advance';
      if (p.referenceType === 'EMPLOYEE_DEPOSIT') desc = 'Personal Savings Deposit';

      ledger.push({
        id: p.id,
        date: p.paidAt,
        transNo: (p.mpesaReceiptNumber || p.id).substring(0, 10).toUpperCase(),
        description: desc,
        debtIncrease: p.referenceType === 'EMPLOYEE_SALARY' ? Number(p.amount) : 0,
        payment: p.referenceType !== 'EMPLOYEE_SALARY' ? Number(p.amount) : 0,
      });
    });

    ledger.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    return ledger.reverse();
  }

  static async reversePayment(
    businessId: string,
    userId: string,
    customerId: string,
    paymentId: string
  ) {
    return await db.transaction(async (tx) => {
      // 1. Fetch payment and verify it exists and is completed
      const [payment] = await tx.select()
        .from(payments)
        .where(and(
          eq(payments.id, paymentId),
          eq(payments.businessId, businessId),
          inArray(payments.referenceType, ['CUSTOMER_DEBT', 'EMPLOYEE_SALARY', 'EMPLOYEE_DEPOSIT']),
          eq(payments.referenceId, customerId),
          eq(payments.status, 'COMPLETED')
        ));

      if (!payment) {
        throw new AppError('Payment not found or already reversed', 404);
      }

      const isSettlement = (payment.notes || '').toLowerCase().includes('settlement') || 
                           (payment.notes || '').toLowerCase().includes('pay cycle close');
      if (isSettlement) {
        throw new AppError('Full cycle salary settlement payments cannot be reversed directly.', 400);
      }

      // 2. Fetch customer
      const [customer] = await tx.select()
        .from(customers)
        .where(and(eq(customers.id, customerId), eq(customers.businessId, businessId)));

      if (!customer) {
        throw new AppError('Customer not found', 404);
      }

      const payAmount = Number(payment.amount);

      const currentBal = Number(customer.balance);
      const restoredBalance = currentBal + payAmount;

      // 3. Update customer balance backwards
      const [updatedCustomer] = await tx.update(customers)
        .set({
          balance: restoredBalance.toString(),
          hasActiveCredit: restoredBalance > 0,
          updatedAt: new Date()
        })
        .where(eq(customers.id, customerId))
        .returning();

      // 4. Update payment status to FAILED so it's removed from active payment history
      await tx.update(payments)
        .set({
          status: 'FAILED',
          notes: `Reversed by user: ${payment.notes || ''}`.trim()
        })
        .where(eq(payments.id, paymentId));

      // 5. Reverse sale allocations (LIFO order: reverse latest paid sales first)
      let remainingToReverse = payAmount;
      const paidSales = await tx.select()
        .from(sales)
        .where(and(
          eq(sales.businessId, businessId),
          eq(sales.customerId, customerId),
          sql`${sales.amountPaid} > 0`
        ))
        .orderBy(desc(sales.soldAt));

      for (const sale of paidSales) {
        if (remainingToReverse <= 0) break;

        const salePaid = Number(sale.amountPaid);
        if (salePaid <= 0) continue;

        const reversalForSale = Math.min(salePaid, remainingToReverse);
        const newPaidAmount = salePaid - reversalForSale;
        const saleTotal = Number(sale.totalAmount);
        const newPaymentStatus = newPaidAmount >= saleTotal ? 'PAID' : (newPaidAmount > 0 ? 'PARTIAL' : 'UNPAID');

        await tx.update(sales)
          .set({
            amountPaid: newPaidAmount.toString(),
            paymentStatus: newPaymentStatus,
          })
          .where(eq(sales.id, sale.id));

        remainingToReverse -= reversalForSale;
      }

      await this.invalidateCustomerCache(businessId);

      return {
        payment,
        customer: updatedCustomer,
        previousBalance: currentBal,
        reversedAmount: payAmount,
        newBalance: restoredBalance
      };
    });
  }
}
