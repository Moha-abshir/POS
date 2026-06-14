import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { Pool } from 'pg';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config();

async function runMigrations() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : true, // Ensure SSL is always active for Neon DB
    max: 1,
    connectionTimeoutMillis: 15000,
    idleTimeoutMillis: 5000,
    statement_timeout: 30000,
  });

  const db = drizzle(pool);

  console.log('⏳ Running database migrations...');

  // Set a hard timeout so the process can't hang forever
  const timeout = setTimeout(() => {
    console.error('❌ Migration timed out after 60 seconds. Skipping migrations.');
    pool.end();
    process.exit(1);
  }, 60000);

  try {
    // Migrations live in src/db/migrations, but this script runs from dist/db/
    const migrationsPath = path.resolve(__dirname, '../../src/db/migrations');
    console.log(`📂 Migrations folder: ${migrationsPath}`);
    await migrate(db, {
      migrationsFolder: migrationsPath,
    });
    clearTimeout(timeout);
    console.log('✅ Migrations completed successfully.');
  } catch (error: any) {
    clearTimeout(timeout);
    // If migrations fail because they're already applied, that's OK
    if (error.message?.includes('already exists') || error.code === '42701' || error.code === '42710') {
      console.log('⚠️  Some migrations were already applied. Continuing...');
    } else {
      console.error('❌ Migration failed:', error.message);
      throw error;
    }
  } finally {
    await pool.end();
  }
}

runMigrations()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Migration process failed:', err);
    process.exit(1);
  });
