import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';
import * as dotenv from 'dotenv';

dotenv.config();

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: Number(process.env.DB_POOL_MAX || 20),
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 30000, // 30s to allow Neon serverless compute wake up
});

// Prevent idle connection errors from crashing the server
pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
});

export const db = drizzle(pool, { schema });

export async function transactionWithRetry<T>(
  transactionFn: (tx: any) => Promise<T>,
  maxRetries = 3,
  delayMs = 50
): Promise<T> {
  let attempts = 0;
  while (true) {
    attempts++;
    try {
      return await db.transaction(transactionFn);
    } catch (error: any) {
      const isDeadlock = error.code === '40P01' || error.code === '40001';
      if (isDeadlock && attempts < maxRetries) {
        console.warn(`[DB RETRY] Serialization conflict/deadlock (attempt ${attempts}/${maxRetries}). Retrying in ${delayMs}ms...`);
        await new Promise(resolve => setTimeout(resolve, delayMs));
        continue;
      }
      throw error;
    }
  }
}
