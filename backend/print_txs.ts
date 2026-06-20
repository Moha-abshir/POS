import { db } from './src/db/index';
import { mpesaTransactions } from './src/db/schema';

async function main() {
  const txs = await db.select().from(mpesaTransactions);
  console.log("Transactions count:", txs.length);
  console.log("Transactions:", txs.map(t => ({ id: t.id, checkoutRequestId: t.checkoutRequestId, status: t.status, code: t.transactionCode })));
  process.exit(0);
}
main().catch(err => { console.error(err); process.exit(1); });
