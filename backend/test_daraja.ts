import { db } from './src/db/index';
import { mpesaTransactions, businessMpesaAccounts } from './src/db/schema';
import { eq, desc } from 'drizzle-orm';
import { decrypt } from './src/core/utils/crypto.util';

async function main() {
  const tx = await db.query.mpesaTransactions.findFirst({
    orderBy: [desc(mpesaTransactions.createdAt)]
  });
  console.log("Tx:", tx?.checkoutRequestId, tx?.status);
  
  if (!tx) return;
  
  const account = await db.query.businessMpesaAccounts.findFirst({
    where: eq(businessMpesaAccounts.id, tx.mpesaAccountId)
  });
  
  if (!account) return;
  
  const passkey = decrypt(account.passkey);
  const cKey = decrypt(account.consumerKey);
  const cSecret = decrypt(account.consumerSecret);
  const isSandbox = account.environment === 'SANDBOX';
  
  const auth = Buffer.from(`${cKey}:${cSecret}`).toString('base64');
  const tokenUrl = isSandbox 
    ? 'https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials'
    : 'https://api.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials';

  const tokenRes = await fetch(tokenUrl, { headers: { Authorization: `Basic ${auth}` } });
  const tokenData = await tokenRes.json();
  const accessToken = tokenData.access_token;
  
  const date = new Date();
  const timestamp = date.getFullYear().toString() + 
                    (date.getMonth() + 1).toString().padStart(2, '0') + 
                    date.getDate().toString().padStart(2, '0') + 
                    date.getHours().toString().padStart(2, '0') + 
                    date.getMinutes().toString().padStart(2, '0') + 
                    date.getSeconds().toString().padStart(2, '0');
                    
  const password = Buffer.from(`${account.shortcode}${passkey}${timestamp}`).toString('base64');
  
  const url = isSandbox
    ? 'https://sandbox.safaricom.co.ke/mpesa/stkpushquery/v1/query'
    : 'https://api.safaricom.co.ke/mpesa/stkpushquery/v1/query';
    
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      BusinessShortCode: account.shortcode,
      Password: password,
      Timestamp: timestamp,
      CheckoutRequestID: tx.checkoutRequestId
    })
  });
  
  console.log("HTTP Status:", response.status);
  const data = await response.text();
  console.log("Response Body:", data);
  process.exit(0);
}
main();
