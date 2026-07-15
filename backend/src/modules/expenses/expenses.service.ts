import { db } from '../../db';
import { expenses, users } from '../../db/schema';
import { eq, and, isNull, desc, sql } from 'drizzle-orm';

export class ExpensesService {
  /**
   * Create a new general business expense
   */
  static async createExpense(
    businessId: string,
    userId: string,
    data: {
      category: string;
      amount: number;
      description?: string;
      expenseDate?: string;
    }
  ) {
    const [expense] = await db.insert(expenses).values({
      businessId,
      category: data.category,
      amount: data.amount.toString(),
      description: data.description || null,
      expenseDate: data.expenseDate ? new Date(data.expenseDate) : new Date(),
      createdBy: userId,
    }).returning();

    return expense;
  }

  /**
   * Get all active expenses for a business
   */
  static async getExpenses(businessId: string) {
    return await db
      .select({
        id: expenses.id,
        category: expenses.category,
        amount: expenses.amount,
        description: expenses.description,
        expenseDate: expenses.expenseDate,
        createdAt: expenses.createdAt,
        createdBy: expenses.createdBy,
        createdByName: sql<string>`COALESCE(${users.firstName} || ' ' || ${users.lastName}, 'System')`,
      })
      .from(expenses)
      .leftJoin(users, eq(expenses.createdBy, users.id))
      .where(and(eq(expenses.businessId, businessId), isNull(expenses.deletedAt)))
      .orderBy(desc(expenses.expenseDate));
  }

  /**
   * Soft-delete a specific business expense
   */
  static async deleteExpense(businessId: string, id: string) {
    const [deleted] = await db
      .update(expenses)
      .set({ deletedAt: new Date() })
      .where(and(eq(expenses.id, id), eq(expenses.businessId, businessId)))
      .returning();

    return deleted;
  }
}
