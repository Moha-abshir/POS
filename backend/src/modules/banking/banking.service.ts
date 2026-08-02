import { eq, and, sql, desc, isNull } from 'drizzle-orm';
import { db } from '../../db';
import { bankingCustomers, bankingTransactions } from '../../db/schema';
import { AppError } from '../../core/utils/AppError';

export class BankingService {
  private static async generateNextCode(businessId: string): Promise<string> {
    const existing = await db.query.bankingCustomers.findMany({
      where: and(eq(bankingCustomers.businessId, businessId), isNull(bankingCustomers.deletedAt)),
      columns: { code: true }
    });

    let maxNum = 0;
    for (const item of existing) {
      if (item.code) {
        const match = item.code.match(/BK(\d+)/i);
        if (match) {
          const num = parseInt(match[1], 10);
          if (num > maxNum) maxNum = num;
        }
      }
    }

    const nextNum = maxNum + 1;
    return `BK${nextNum.toString().padStart(3, '0')}`;
  }

  public static async getCustomers(businessId: string) {
    const customers = await db.query.bankingCustomers.findMany({
      where: and(eq(bankingCustomers.businessId, businessId), isNull(bankingCustomers.deletedAt)),
      orderBy: [desc(bankingCustomers.createdAt)]
    });

    let totalBalance = 0;
    for (const c of customers) {
      totalBalance += parseFloat(c.balance as string || '0');
    }

    return {
      customers,
      totalBalance: totalBalance.toFixed(2)
    };
  }

  public static async createCustomer(businessId: string, data: { code?: string; name: string; phone?: string; idNumber?: string }) {
    if (data.phone) {
      const existing = await db.query.bankingCustomers.findFirst({
        where: and(
          eq(bankingCustomers.businessId, businessId),
          eq(bankingCustomers.phone, data.phone),
          isNull(bankingCustomers.deletedAt)
        ),
      });
      if (existing) throw new AppError('A banking customer with this phone number already exists', 400);
    }

    const code = data.code?.trim() ? data.code.trim().toUpperCase() : await this.generateNextCode(businessId);

    const [customer] = await db.insert(bankingCustomers).values({
      businessId,
      code,
      name: data.name.trim(),
      phone: data.phone?.trim() || null,
      idNumber: data.idNumber?.trim() || null,
      type: 'BANKER',
      balance: '0',
    }).returning();

    return customer;
  }

  public static async updateCustomer(businessId: string, id: string, data: { code?: string; name: string; phone?: string; idNumber?: string }) {
    const existing = await db.query.bankingCustomers.findFirst({
      where: and(
        eq(bankingCustomers.businessId, businessId),
        eq(bankingCustomers.id, id),
        isNull(bankingCustomers.deletedAt)
      ),
    });

    if (!existing) throw new AppError('Banking customer not found', 404);

    if (data.phone && data.phone !== existing.phone) {
      const phoneCheck = await db.query.bankingCustomers.findFirst({
        where: and(
          eq(bankingCustomers.businessId, businessId),
          eq(bankingCustomers.phone, data.phone),
          isNull(bankingCustomers.deletedAt)
        ),
      });
      if (phoneCheck) throw new AppError('Another customer already uses this phone number', 400);
    }

    const [updated] = await db.update(bankingCustomers)
      .set({
        code: data.code?.trim() || existing.code,
        name: data.name.trim(),
        phone: data.phone?.trim() || null,
        idNumber: data.idNumber?.trim() || null,
        updatedAt: new Date()
      })
      .where(eq(bankingCustomers.id, id))
      .returning();

    return updated;
  }

  public static async deleteCustomer(businessId: string, id: string) {
    const existing = await db.query.bankingCustomers.findFirst({
      where: and(
        eq(bankingCustomers.businessId, businessId),
        eq(bankingCustomers.id, id),
        isNull(bankingCustomers.deletedAt)
      ),
    });

    if (!existing) throw new AppError('Banking customer not found', 404);

    const [deleted] = await db.update(bankingCustomers)
      .set({ deletedAt: new Date() })
      .where(eq(bankingCustomers.id, id))
      .returning();

    return deleted;
  }

  public static async getLedger(businessId: string, customerId: string) {
    const customer = await db.query.bankingCustomers.findFirst({
      where: and(
        eq(bankingCustomers.businessId, businessId),
        eq(bankingCustomers.id, customerId),
        isNull(bankingCustomers.deletedAt)
      ),
    });

    if (!customer) throw new AppError('Customer not found', 404);

    const transactions = await db.query.bankingTransactions.findMany({
      where: and(
        eq(bankingTransactions.businessId, businessId),
        eq(bankingTransactions.bankingCustomerId, customerId)
      ),
      orderBy: [desc(bankingTransactions.createdAt)],
    });

    return { customer, transactions };
  }

  public static async processTransaction(businessId: string, userId: string, data: { customerId: string, type: 'DEPOSIT' | 'WITHDRAWAL', amount: number, notes?: string }) {
    if (data.amount <= 0) throw new AppError('Amount must be positive', 400);

    return await db.transaction(async (tx) => {
      const customer = await tx.query.bankingCustomers.findFirst({
        where: and(
          eq(bankingCustomers.businessId, businessId),
          eq(bankingCustomers.id, data.customerId),
          isNull(bankingCustomers.deletedAt)
        ),
      });

      if (!customer) throw new AppError('Customer not found', 404);

      let currentBalance = parseFloat(customer.balance as string || '0');
      let depositAmount = 0;
      let withdrawAmount = 0;

      if (data.type === 'DEPOSIT') {
        currentBalance += data.amount;
        depositAmount = data.amount;
      } else if (data.type === 'WITHDRAWAL') {
        currentBalance -= data.amount;
        withdrawAmount = data.amount;
      }

      // Find max transNo for this business
      const maxTransResult = await tx.select({
        maxNo: sql<number>`COALESCE(MAX(${bankingTransactions.transNo}), 300)`
      }).from(bankingTransactions).where(eq(bankingTransactions.businessId, businessId));

      const nextTransNo = (maxTransResult[0]?.maxNo || 300) + 1;

      const [updatedCustomer] = await tx.update(bankingCustomers)
        .set({ balance: currentBalance.toString(), updatedAt: new Date() })
        .where(eq(bankingCustomers.id, customer.id))
        .returning();

      const [transaction] = await tx.insert(bankingTransactions).values({
        businessId,
        bankingCustomerId: customer.id,
        transNo: nextTransNo,
        type: data.type,
        amount: data.amount.toString(),
        depositAmount: depositAmount.toString(),
        withdrawAmount: withdrawAmount.toString(),
        balanceAfter: currentBalance.toString(),
        notes: data.notes || null,
        createdBy: userId,
      }).returning();

      return { customer: updatedCustomer, transaction };
    });
  }

  public static async importCustomers(businessId: string, customers: any[]) {
    if (!customers || customers.length === 0) return { imported: 0 };
    
    let imported = 0;
    
    await db.transaction(async (tx) => {
      for (const c of customers) {
        if (!c.name) continue;
        
        let phone = c.phone?.toString().trim();
        if (phone === '') phone = null;

        if (phone) {
          const existing = await tx.query.bankingCustomers.findFirst({
            where: and(
              eq(bankingCustomers.businessId, businessId),
              eq(bankingCustomers.phone, phone),
              isNull(bankingCustomers.deletedAt)
            ),
          });
          if (existing) continue;
        }

        const code = c.code?.trim() || await this.generateNextCode(businessId);

        await tx.insert(bankingCustomers).values({
          businessId,
          code,
          name: c.name.trim(),
          phone: phone || null,
          idNumber: c.idNumber?.trim() || null,
          type: 'BANKER',
          balance: c.balance ? parseFloat(c.balance).toString() : '0',
        });
        imported++;
      }
    });

    return { imported };
  }
}
