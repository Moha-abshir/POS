import { Client } from 'pg';
import 'dotenv/config';

async function main() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  
  const txs = await client.query(`SELECT checkout_request_id, status, result_desc, raw_callback_json FROM mpesa_transactions ORDER BY created_at DESC LIMIT 1`);
  console.log("Latest transaction:", txs.rows[0]);
  
  if (txs.rows[0]) {
    const sale = await client.query(`SELECT id, total_amount, amount_paid, payment_status FROM sales ORDER BY created_at DESC LIMIT 1`);
    console.log("Latest sale:", sale.rows[0]);
  }
  await client.end();
}
main().catch(console.error);
