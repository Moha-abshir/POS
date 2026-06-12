import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';
import * as dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: Number(process.env.DB_POOL_MAX || 20),
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000, // Increased to 10s to allow Neon serverless to wake up
});

// Prevent idle connection errors from crashing the server
pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
});

export const db = drizzle(pool, { schema });
