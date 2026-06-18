import { eq, and, sql, desc } from 'drizzle-orm';
import { db } from '../../db';
import { customers, sales } from '../../db/schema';

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
}
