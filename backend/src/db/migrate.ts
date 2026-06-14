import { Pool } from 'pg';
import * as dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config();

async function runMigrations() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : true,
    max: 1,
    connectionTimeoutMillis: 15000,
    idleTimeoutMillis: 5000,
  });

  console.log('⏳ Running database schema updates...');

  try {
    const client = await pool.connect();
    const migrationsPath = path.resolve(__dirname, '../../src/db/migrations');
    
    // Read the journal to get the order
    const journalPath = path.join(migrationsPath, 'meta/_journal.json');
    if (!fs.existsSync(journalPath)) {
      console.log('No migration journal found. Skipping.');
      process.exit(0);
    }

    const journal = JSON.parse(fs.readFileSync(journalPath, 'utf-8'));
    
    for (const entry of journal.entries) {
      const sqlPath = path.join(migrationsPath, `${entry.tag}.sql`);
      if (fs.existsSync(sqlPath)) {
        console.log(`Executing migration: ${entry.tag}.sql`);
        const sqlContent = fs.readFileSync(sqlPath, 'utf-8');
        const statements = sqlContent.split('--> statement-breakpoint');
        
        for (let stmt of statements) {
          stmt = stmt.trim();
          if (!stmt) continue;
          
          try {
            await client.query(stmt);
          } catch (error: any) {
            // Ignore errors for things that already exist (since we used 'push' previously)
            const isAlreadyExists = 
              error.code === '42P07' || // relation already exists
              error.code === '42701' || // column already exists
              error.code === '42710' || // constraint already exists
              error.code === '42704' || // object does not exist (e.g. dropping a missing constraint)
              error.message?.includes('already exists') ||
              error.message?.includes('does not exist');
              
            if (!isAlreadyExists) {
              console.error(`❌ Failed to execute statement: ${stmt}`);
              console.error(error);
              throw error;
            }
          }
        }
      }
    }

    console.log('✅ Database schema updates completed successfully.');
    client.release();
  } catch (error) {
    console.error('❌ Schema update failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runMigrations();
