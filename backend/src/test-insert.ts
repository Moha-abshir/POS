import * as dotenv from 'dotenv';
dotenv.config({ path: '../.env' });
import { db } from './db';
import { customers } from './db/schema';
import { eq } from 'drizzle-orm';

async function test() {
  try {
    const firstCustomer = await db.select().from(customers).limit(1);
    if (firstCustomer.length === 0) return;
    
    const businessId = firstCustomer[0].businessId;
    const userId = firstCustomer[0].createdBy;
    
    const [newCustomer] = await db.insert(customers).values({
      businessId,
      name: 'TEST BUSINESS INC ' + Date.now(),
      phone: '0700000000',
      type: 'BUSINESS',
      createdBy: userId,
    }).returning();
    
    console.log("SUCCESS: Inserted customer with type:", newCustomer.type);
    
    await db.delete(customers).where(eq(customers.id, newCustomer.id));
  } catch (err) {
    console.error("Error:", err);
  } finally {
    process.exit(0);
  }
}

test();
