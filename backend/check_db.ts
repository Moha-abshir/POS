import { db } from './src/db/index';
import { mpesaTransactions, sales } from './src/db/schema';
import { desc } from 'drizzle-orm';

async function main() {
  const tx = await db.query.mpesaTransactions.findFirst({
    orderBy: [desc(mpesaTransactions.createdAt)]
  });
  console.log("Latest Transaction:", tx);
  
  if (tx) {
    const sale = await db.query.sales.findFirst({
      orderBy: [desc(sales.createdAt)]
    });
    console.log("Latest Sale:", sale);
  }
  process.exit(0);
}
main();
