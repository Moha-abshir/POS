import { db } from './db';
import { categories, productVariants, products, stockMovements, variantUnits, purchaseItems, purchases, damagedGoods } from './db/schema';
import { sql } from 'drizzle-orm';

async function main() {
  await db.execute(sql`TRUNCATE TABLE ${damagedGoods} CASCADE`);
  await db.execute(sql`TRUNCATE TABLE ${stockMovements} CASCADE`);
  await db.execute(sql`TRUNCATE TABLE ${purchaseItems} CASCADE`);
  await db.execute(sql`TRUNCATE TABLE ${purchases} CASCADE`);
  await db.execute(sql`TRUNCATE TABLE ${variantUnits} CASCADE`);
  await db.execute(sql`TRUNCATE TABLE ${productVariants} CASCADE`);
  await db.execute(sql`TRUNCATE TABLE ${products} CASCADE`);
  await db.execute(sql`TRUNCATE TABLE ${categories} CASCADE`);
  console.log('Truncated categories and related tables successfully');
  process.exit(0);
}

main().catch(console.error);
