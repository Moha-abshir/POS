import { db } from '../../db';
import { cashDrawerSessions, payments, refunds, sales, users } from '../../db/schema';
import { eq, and, gte, sql, desc, or } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import { NotificationsService } from '../notifications/notifications.service';

export class CashSessionsService {
  /**
   * Get active open session for a business
   */
  static async getActiveSession(businessId: string) {
    const [session] = await db.select({
      id: cashDrawerSessions.id,
      businessId: cashDrawerSessions.businessId,
      openedById: cashDrawerSessions.openedById,
      closedById: cashDrawerSessions.closedById,
      status: cashDrawerSessions.status,
      openingFloat: cashDrawerSessions.openingFloat,
      expectedCash: cashDrawerSessions.expectedCash,
      actualCash: cashDrawerSessions.actualCash,
      difference: cashDrawerSessions.difference,
      denominationCounts: cashDrawerSessions.denominationCounts,
      notes: cashDrawerSessions.notes,
      openedAt: cashDrawerSessions.openedAt,
      closedAt: cashDrawerSessions.closedAt,
      openedByFirstName: users.firstName,
      openedByLastName: users.lastName,
    })
    .from(cashDrawerSessions)
    .innerJoin(users, eq(cashDrawerSessions.openedById, users.id))
    .where(
      and(
        eq(cashDrawerSessions.businessId, businessId),
        eq(cashDrawerSessions.status, 'OPEN')
      )
    )
    .limit(1);

    if (!session) return null;

    // Calculate current expected cash in real-time
    const currentExpected = await this.calculateExpectedCash(businessId, session.openedAt, Number(session.openingFloat));
    return {
      ...session,
      expectedCash: currentExpected,
    };
  }

  /**
   * Open a new session
   */
  static async openSession(businessId: string, userId: string, openingFloat: number) {
    // Check if there is already an open session
    const active = await this.getActiveSession(businessId);
    if (active) {
      throw new Error('A cash register session is already active');
    }

    const [newSession] = await db.insert(cashDrawerSessions).values({
      businessId,
      openedById: userId,
      status: 'OPEN',
      openingFloat: openingFloat.toString(),
      expectedCash: openingFloat.toString(),
      actualCash: '0',
      difference: '0',
    }).returning();

    return newSession;
  }

  /**
   * Close active session
   */
  static async closeSession(
    businessId: string,
    userId: string,
    denominationCounts: Record<string, number>,
    actualCash: number,
    notes?: string
  ) {
    const active = await this.getActiveSession(businessId);
    if (!active) {
      throw new Error('No active cash register session found');
    }

    const expectedCash = await this.calculateExpectedCash(businessId, active.openedAt, Number(active.openingFloat));
    const difference = actualCash - Math.abs(expectedCash);

    const [closedSession] = await db.update(cashDrawerSessions)
      .set({
        status: 'CLOSED',
        closedById: userId,
        closedAt: new Date(),
        expectedCash: expectedCash.toString(),
        actualCash: actualCash.toString(),
        difference: difference.toString(),
        denominationCounts,
        notes: notes || null,
      })
      .where(eq(cashDrawerSessions.id, active.id))
      .returning();

    // Fetch user details for notification
    const [cashier] = await db.select()
      .from(users)
      .where(eq(users.id, active.openedById))
      .limit(1);

    const cashierName = cashier ? `${cashier.firstName} ${cashier.lastName}` : 'Cashier';

    // If there is a discrepancy, trigger a notification
    if (Math.abs(difference) > 0.01) {
      const discrepancyType = difference > 0 ? 'surplus' : 'shortage';
      const formattedDiff = Math.abs(difference).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      const formattedExpected = expectedCash.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      const formattedActual = actualCash.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      
      const title = `Cash Drawer Discrepancy (${discrepancyType.toUpperCase()})`;
      const message = `Shift closed by ${cashierName} has a discrepancy of KES ${formattedDiff} (${discrepancyType}). Expected: KES ${formattedExpected}, Counted: KES ${formattedActual}.${notes ? ` Notes: ${notes}` : ''}`;
      
      await NotificationsService.createNotification(
        businessId,
        'CASH_DISCREPANCY',
        title,
        message
      );
    }

    return closedSession;
  }

  /**
   * Get historical sessions
   */
  static async getHistory(businessId: string) {
    const openedUsers = alias(users, 'opened_users');
    const closedUsers = alias(users, 'closed_users');

    return await db.select({
      id: cashDrawerSessions.id,
      status: cashDrawerSessions.status,
      openingFloat: cashDrawerSessions.openingFloat,
      expectedCash: cashDrawerSessions.expectedCash,
      actualCash: cashDrawerSessions.actualCash,
      difference: cashDrawerSessions.difference,
      denominationCounts: cashDrawerSessions.denominationCounts,
      notes: cashDrawerSessions.notes,
      openedAt: cashDrawerSessions.openedAt,
      closedAt: cashDrawerSessions.closedAt,
      openedByName: sql<string>`COALESCE(${openedUsers.firstName} || ' ' || ${openedUsers.lastName}, 'System')`,
      closedByName: sql<string>`COALESCE(${closedUsers.firstName} || ' ' || ${closedUsers.lastName}, 'N/A')`,
    })
    .from(cashDrawerSessions)
    .leftJoin(openedUsers, eq(cashDrawerSessions.openedById, openedUsers.id))
    .leftJoin(closedUsers, eq(cashDrawerSessions.closedById, closedUsers.id))
    .where(eq(cashDrawerSessions.businessId, businessId))
    .orderBy(desc(cashDrawerSessions.openedAt));
  }

  /**
   * Calculate expected cash in drawer dynamically
   */
  private static async calculateExpectedCash(businessId: string, openedAt: Date, openingFloat: number): Promise<number> {
    // 1. CASH payments received (Sales & customer debt payments)
    const [cashIn] = await db.select({
      total: sql<string>`COALESCE(SUM(${payments.amount}), 0)`
    })
    .from(payments)
    .where(
      and(
        eq(payments.businessId, businessId),
        eq(payments.method, 'CASH'),
        eq(payments.status, 'COMPLETED'),
        gte(payments.paidAt, openedAt),
        or(
          eq(payments.referenceType, 'SALE'),
          eq(payments.referenceType, 'CUSTOMER_DEBT')
        )
      )
    );

    // 2. CASH payments paid out (Purchases & supplier debt payments)
    const [cashOut] = await db.select({
      total: sql<string>`COALESCE(SUM(${payments.amount}), 0)`
    })
    .from(payments)
    .where(
      and(
        eq(payments.businessId, businessId),
        eq(payments.method, 'CASH'),
        eq(payments.status, 'COMPLETED'),
        gte(payments.paidAt, openedAt),
        or(
          eq(payments.referenceType, 'PURCHASE'),
          eq(payments.referenceType, 'SUPPLIER_DEBT')
        )
      )
    );

    // 3. Refunds processed on CASH sales
    const [cashRefunds] = await db.select({
      total: sql<string>`COALESCE(SUM(${refunds.totalAmount}), 0)`
    })
    .from(refunds)
    .innerJoin(sales, eq(refunds.saleId, sales.id))
    .where(
      and(
        eq(refunds.businessId, businessId),
        gte(refunds.refundedAt, openedAt),
        eq(sales.paymentMethod, 'CASH')
      )
    );

    const received = Number(cashIn?.total || 0);
    const paid = Number(cashOut?.total || 0);
    const refunded = Number(cashRefunds?.total || 0);

    return openingFloat + received - paid - refunded;
  }
}
