import { Pool } from 'pg';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function truncate() {
  try {
    console.log('Truncating database...');
    // Cascade handles users, sessions, categories, products, product_units, etc.
    await pool.query('TRUNCATE TABLE businesses CASCADE;');
    await pool.query('TRUNCATE TABLE otps CASCADE;');
    console.log('Database successfully cleared.');
  } catch (error) {
    console.error('Error truncating database:', error);
  } finally {
    await pool.end();
    process.exit(0);
  }
}

truncate();
