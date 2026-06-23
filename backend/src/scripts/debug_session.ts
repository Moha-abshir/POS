import { db } from '../db';
import { cashDrawerSessions, payments, refunds, sales } from '../db/schema';
import { eq, and, gte, sql, or } from 'drizzle-orm';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../../.env') });

async function main() {
  try {
    const [active] = await db.select()
      .from(cashDrawerSessions)
      .where(eq(cashDrawerSessions.status, 'OPEN'))
      .limit(1);

    if (!active) {
      console.log("No active open cash session found!");
      return;
    }

    console.log("Active Session:", active);

    const openedAt = active.openedAt;
    const businessId = active.businessId;

    // 1. CASH in
    const cashIn = await db.select()
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
    console.log("CASH IN payments during session:", cashIn);

    // 2. CASH out
    const cashOut = await db.select()
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
    console.log("CASH OUT payments during session:", cashOut);

    // 3. Refunds
    const cashRefunds = await db.select()
      .from(refunds)
      .innerJoin(sales, eq(refunds.saleId, sales.id))
      .where(
        and(
          eq(refunds.businessId, businessId),
          gte(refunds.refundedAt, openedAt),
          eq(sales.paymentMethod, 'CASH')
        )
      );
    console.log("CASH REFUNDS during session:", cashRefunds);

  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}

main();
