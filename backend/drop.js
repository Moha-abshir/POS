const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function drop() {
  try {
    await pool.query('DROP TABLE IF EXISTS otps CASCADE');
    console.log('Dropped otps table');
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

drop();
