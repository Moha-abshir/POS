import { db } from './src/db/index';
import { sales, payments, mpesaTransactions } from './src/db/schema';
import { eq, and, isNotNull } from 'drizzle-orm';

async function main() {
  console.log("Starting backfill...");
  
  // Find all completed mpesa transactions with a code
  const txs = await db.select({
    transactionCode: mpesaTransactions.transactionCode,
    saleId: payments.referenceId,
    paymentId: payments.id
  })
  .from(mpesaTransactions)
  .innerJoin(payments, eq(mpesaTransactions.paymentId, payments.id))
  .where(and(
    eq(mpesaTransactions.status, 'COMPLETED'),
    eq(payments.referenceType, 'SALE'),
    isNotNull(mpesaTransactions.transactionCode)
  ));

  console.log(`Found ${txs.length} completed transactions.`);

  let updated = 0;
  for (const tx of txs) {
    if (!tx.transactionCode) continue;

    // Check if the sale doesn't have the reference set
    const sale = await db.query.sales.findFirst({
      where: eq(sales.id, tx.saleId)
    });

    if (sale && !sale.mpesaRef) {
      console.log(`Updating Sale ${sale.id} with Ref ${tx.transactionCode}`);
      
      // Update sale
      await db.update(sales)
        .set({ mpesaRef: tx.transactionCode })
        .where(eq(sales.id, sale.id));

      // Update payment
      await db.update(payments)
        .set({ mpesaReceiptNumber: tx.transactionCode })
        .where(eq(payments.id, tx.paymentId));
        
      updated++;
    }
  }

  console.log(`Backfill complete. Updated ${updated} sales.`);
  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
