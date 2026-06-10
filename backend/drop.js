const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function drop() {
  try {
    await pool.query('DROP TABLE IF EXISTS product_units CASCADE');
    await pool.query('DROP TABLE IF EXISTS products CASCADE');
    await pool.query('DROP TABLE IF EXISTS categories CASCADE');
    await pool.query('DROP TABLE IF EXISTS sessions CASCADE');
    await pool.query('DROP TABLE IF EXISTS otps CASCADE');
    await pool.query('DROP TABLE IF EXISTS users CASCADE');
    await pool.query('DROP TABLE IF EXISTS businesses CASCADE');
    console.log('Dropped all tables');
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

drop();
