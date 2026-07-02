import fs from 'fs';
import { Pool } from 'pg';
import * as dotenv from 'dotenv';
dotenv.config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const sql = fs.readFileSync('./src/db/migrations/0015_tidy_black_bird.sql', 'utf-8');

async function main() {
  try {
    const statements = sql.split('--> statement-breakpoint');
    for (let stmt of statements) {
      if (stmt.trim()) {
        console.log('Executing SQL statement:\n', stmt);
        await pool.query(stmt);
      }
    }
    console.log('Database Indexes Applied Successfully.');
  } catch(e) {
    console.error('Migration failed:', e);
  } finally {
    await pool.end();
  }
}
main();
