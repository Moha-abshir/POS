import { db, pool } from '../db';
import { users } from '../db/schema';

async function test() {
  try {
    const allUsers = await db.select().from(users);
    console.log('All Users in DB:', allUsers);
  } catch (error) {
    console.error('Error fetching users:', error);
  } finally {
    await pool.end();
  }
}

test();
