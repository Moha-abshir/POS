import fs from 'fs';
import { Pool } from 'pg';
import * as dotenv from 'dotenv';
dotenv.config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const sql = fs.readFileSync('./src/db/migrations/0005_dry_golden_guardian.sql', 'utf-8');

async function main() {
  try {
    const statements = sql.split('--> statement-breakpoint');
    for (let stmt of statements) {
      if (stmt.trim()) {
        await pool.query(stmt);
      }
    }
    console.log('SQL Applied');
  } catch(e) {
    console.error(e);
  } finally {
    await pool.end();
  }
}
main();
