import { Pool } from 'pg';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function alter() {
  try {
    console.log('Altering database...');
    await pool.query('ALTER TABLE "businesses" ADD COLUMN "sector" varchar(100);');
    await pool.query('ALTER TABLE "businesses" ADD COLUMN "phone" varchar(50);');
    await pool.query('ALTER TABLE "businesses" ADD COLUMN "location" text;');
    await pool.query('ALTER TABLE "businesses" ADD COLUMN "is_setup_complete" boolean DEFAULT false NOT NULL;');
    await pool.query('ALTER TABLE "users" ADD COLUMN "first_name" varchar(100);');
    await pool.query('ALTER TABLE "users" ADD COLUMN "last_name" varchar(100);');
    await pool.query('ALTER TABLE "users" ADD COLUMN "mobile_number" varchar(50);');
    console.log('Database successfully altered.');
  } catch (error: any) {
    // Ignore column already exists errors
    if (error.code === '42701') {
      console.log('Columns already exist.');
    } else {
      console.error('Error altering database:', error);
    }
  } finally {
    await pool.end();
    process.exit(0);
  }
}

alter();
