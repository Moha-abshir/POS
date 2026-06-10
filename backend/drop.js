const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function drop() {
  await pool.query('DROP TABLE otps CASCADE;');
  console.log('otps table dropped');
  process.exit(0);
}

drop().catch(console.error);
