import { eq, and, sql, desc, or } from 'drizzle-orm';
import { db } from '../../db';
import { bankingCustomers, bankingTransactions } from '../../db/schema';
import { AppError } from '../../core/utils/AppError';

export class BankingService {
  public static async getCustomers(businessId: string, type?: 'BANKER' | 'LOAN_CLIENT') {
    let query = db.select().from(bankingCustomers).where(eq(bankingCustomers.businessId, businessId));
    
    if (type) {
      query = db.select().from(bankingCustomers).where(and(eq(bankingCustomers.businessId, businessId), eq(bankingCustomers.type, type)));
    }

    return await query.orderBy(desc(bankingCustomers.createdAt));
  }

  public static async createCustomer(businessId: string, data: { name: string; phone?: string; type: 'BANKER' | 'LOAN_CLIENT' }) {
    if (data.phone) {
      const existing = await db.query.bankingCustomers.findFirst({
        where: and(eq(bankingCustomers.businessId, businessId), eq(bankingCustomers.phone, data.phone)),
      });
      if (existing) throw new AppError('A banking customer with this phone number already exists', 400);
    }

    const [customer] = await db.insert(bankingCustomers).values({
      businessId,
      name: data.name,
      phone: data.phone || null,
      type: data.type,
      balance: '0',
    }).returning();

    return customer;
  }

  public static async getLedger(businessId: string, customerId: string) {
    const customer = await db.query.bankingCustomers.findFirst({
      where: and(eq(bankingCustomers.businessId, businessId), eq(bankingCustomers.id, customerId)),
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

  public static async processTransaction(businessId: string, userId: string, data: { customerId: string, type: 'DEPOSIT' | 'WITHDRAWAL' | 'LOAN_ISSUED' | 'LOAN_REPAYMENT', amount: number, notes?: string }) {
    if (data.amount <= 0) throw new AppError('Amount must be positive', 400);

    return await db.transaction(async (tx) => {
      const customer = await tx.query.bankingCustomers.findFirst({
        where: and(eq(bankingCustomers.businessId, businessId), eq(bankingCustomers.id, data.customerId)),
      });

      if (!customer) throw new AppError('Customer not found', 404);

      let currentBalance = parseFloat(customer.balance as string);
      
      // DEPOSIT / LOAN_REPAYMENT increases balance (adds float or reduces debt)
      // WITHDRAWAL / LOAN_ISSUED decreases balance (reduces float or increases debt)
      if (data.type === 'DEPOSIT' || data.type === 'LOAN_REPAYMENT') {
        currentBalance += data.amount;
      } else if (data.type === 'WITHDRAWAL' || data.type === 'LOAN_ISSUED') {
        currentBalance -= data.amount;
      }

      const [updatedCustomer] = await tx.update(bankingCustomers)
        .set({ balance: currentBalance.toString() })
        .where(eq(bankingCustomers.id, customer.id))
        .returning();

      const [transaction] = await tx.insert(bankingTransactions).values({
        businessId,
        bankingCustomerId: customer.id,
        type: data.type,
        amount: data.amount.toString(),
        balanceAfter: currentBalance.toString(),
        notes: data.notes,
        createdBy: userId,
      }).returning();

      return { customer: updatedCustomer, transaction };
    });
  }

  public static async importCustomers(businessId: string, customers: any[]) {
    // Basic CSV array chunked insert
    if (!customers || customers.length === 0) return { imported: 0 };
    
    let imported = 0;
    
    await db.transaction(async (tx) => {
      for (const c of customers) {
        if (!c.name) continue;
        
        let phone = c.phone?.toString().trim();
        if (phone === '') phone = null;

        if (phone) {
          const existing = await tx.query.bankingCustomers.findFirst({
            where: and(eq(bankingCustomers.businessId, businessId), eq(bankingCustomers.phone, phone)),
          });
          if (existing) continue; // Skip duplicates by phone
        }

        await tx.insert(bankingCustomers).values({
          businessId,
          name: c.name,
          phone: phone || null,
          type: c.type === 'LOAN_CLIENT' ? 'LOAN_CLIENT' : 'BANKER',
          balance: c.balance ? parseFloat(c.balance).toString() : '0',
        });
        imported++;
      }
    });

    return { imported };
  }
}
