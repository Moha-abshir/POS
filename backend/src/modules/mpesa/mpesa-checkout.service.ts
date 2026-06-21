import { eq, and, isNull } from 'drizzle-orm';
import { SalesService } from '../sales/sales.service';
import { db } from '../../db';
import { businessMpesaAccounts, payments, mpesaTransactions, sales } from '../../db/schema';
import { decrypt } from '../../core/utils/crypto.util';
import crypto from 'crypto';

export class MpesaCheckoutService {
  private static async getOAuthToken(cKey: string, cSecret: string, isSandbox: boolean): Promise<string> {
    const auth = Buffer.from(`${cKey}:${cSecret}`).toString('base64');
    const url = isSandbox 
      ? 'https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials'
      : 'https://api.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials';

    const response = await fetch(url, {
      headers: {
        Authorization: `Basic ${auth}`
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to generate M-Pesa access token: ${response.statusText}`);
    }
    const data = await response.json();
    return data.access_token;
  }

  static async initiateSTKPush(businessId: string, saleId: string, phoneNumber: string, amount: number) {
    // 1. Get Default Active M-Pesa Account
    const account = await db.query.businessMpesaAccounts.findFirst({
      where: and(
        eq(businessMpesaAccounts.businessId, businessId),
        eq(businessMpesaAccounts.isDefault, true),
        eq(businessMpesaAccounts.isActive, true),
        isNull(businessMpesaAccounts.deletedAt)
      )
    });

    if (!account) {
      throw new Error("No active default M-Pesa account found for this business.");
    }

    // 2. Prepare Payload (in real life, fetch OAuth token first)
    // We decrypt only when needed
    const cKey = decrypt(account.consumerKey);
    const cSecret = decrypt(account.consumerSecret);
    const passkey = decrypt(account.passkey);

    const isSandbox = account.environment === 'SANDBOX';

    // 3. Generate OAuth Token and Send STK Push Request to Safaricom
    const accessToken = await this.getOAuthToken(cKey, cSecret, isSandbox);

    // Timestamp must be YYYYMMDDHHmmss
    const date = new Date();
    const timestamp = date.getFullYear().toString() + 
                      (date.getMonth() + 1).toString().padStart(2, '0') + 
                      date.getDate().toString().padStart(2, '0') + 
                      date.getHours().toString().padStart(2, '0') + 
                      date.getMinutes().toString().padStart(2, '0') + 
                      date.getSeconds().toString().padStart(2, '0');

    const password = Buffer.from(`${account.shortcode}${passkey}${timestamp}`).toString('base64');

    // Get the webhook URL securely
    const appUrl = process.env.APP_URL || (process.env.RAILWAY_PUBLIC_DOMAIN ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}` : null);
    
    if (!appUrl) {
      throw new Error("Missing APP_URL environment variable. Safaricom requires a public webhook URL to notify us of the payment.");
    }

    // Format Phone Number to 2547XXXXXXXX
    let formattedPhone = phoneNumber.replace(/[^0-9]/g, '');
    if (formattedPhone.startsWith('0')) {
      formattedPhone = `254${formattedPhone.slice(1)}`;
    } else if (formattedPhone.length === 9) {
      formattedPhone = `254${formattedPhone}`;
    }

    const webhookToken = process.env.MPESA_WEBHOOK_TOKEN;
    const callbackUrl = webhookToken 
      ? `${appUrl}/mpesa/webhook/callback?token=${webhookToken}`
      : `${appUrl}/mpesa/webhook/callback`;

    const payload = {
      BusinessShortCode: account.shortcode,
      Password: password,
      Timestamp: timestamp,
      TransactionType: account.accountType === 'PAYBILL' ? 'CustomerPayBillOnline' : 'CustomerBuyGoodsOnline',
      Amount: Math.round(amount), // Safaricom expects integer amounts
      PartyA: formattedPhone,
      PartyB: account.shortcode,
      PhoneNumber: formattedPhone,
      CallBackURL: callbackUrl,
      AccountReference: `Sale ${saleId.slice(0, 8)}`,
      TransactionDesc: "POS Purchase"
    };

    const url = isSandbox
      ? 'https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest'
      : 'https://api.safaricom.co.ke/mpesa/stkpush/v1/processrequest';

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();

    if (!response.ok || data.errorCode) {
      console.error("Safaricom API Error:", data);
      throw new Error(data.errorMessage || data.customerMessage || 'Failed to send STK push to Safaricom');
    }

    // 4. Extract Safaricom Checkout ID
    const checkoutRequestId = data.CheckoutRequestID;

    // 5. Create Payment Record (Generic)
    const [payment] = await db.insert(payments).values({
      referenceType: 'SALE',
      referenceId: saleId,
      businessId,
      method: 'MPESA',
      amount: amount.toString(),
      status: 'PENDING'
    }).returning();

    // 6. Create M-Pesa Transaction Record linking to Safaricom ID
    const [transaction] = await db.insert(mpesaTransactions).values({
      paymentId: payment.id,
      mpesaAccountId: account.id,
      checkoutRequestId,
      phoneNumber,
      amount: amount.toString(),
      status: 'PENDING'
    }).returning();

    return {
      checkoutRequestId,
      status: 'PENDING',
      message: 'STK Push sent successfully. Waiting for customer PIN.'
    };
  }

  static async checkStatus(checkoutRequestId: string, businessId: string) {
    const transaction = await db.query.mpesaTransactions.findFirst({
      where: eq(mpesaTransactions.checkoutRequestId, checkoutRequestId)
    });

    if (!transaction) {
      return {
        status: 'FAILED',
        resultDesc: 'Transaction was cancelled or failed'
      };
    }

    return {
      status: transaction.status,
      resultDesc: transaction.resultDesc
    };
  }

  static async processCallback(payload: any) {
    const stkCallback = payload?.Body?.stkCallback;
    if (!stkCallback) throw new Error("Invalid callback payload structure");

    const checkoutRequestId = stkCallback.CheckoutRequestID;
    const resultCode = stkCallback.ResultCode;
    const resultDesc = stkCallback.ResultDesc;

    // Find the transaction
    const transaction = await db.query.mpesaTransactions.findFirst({
      where: eq(mpesaTransactions.checkoutRequestId, checkoutRequestId)
    });

    if (!transaction) throw new Error("Transaction not found in database");

    // Save Raw JSON
    await db.update(mpesaTransactions)
      .set({ rawCallbackJson: payload })
      .where(eq(mpesaTransactions.id, transaction.id));

    if (resultCode === 0) {
      // SUCCESS
      const metadata = stkCallback.CallbackMetadata?.Item || [];
      const receiptNumberItem = metadata.find((i: any) => i.Name === 'MpesaReceiptNumber');
      const mpesaReceiptNumber = receiptNumberItem ? receiptNumberItem.Value : null;

      // Update Transaction
      await db.update(mpesaTransactions)
        .set({
          status: 'COMPLETED',
          resultCode,
          resultDesc,
          transactionCode: mpesaReceiptNumber
        })
        .where(eq(mpesaTransactions.id, transaction.id));

      // Update generic Payment
      await db.update(payments)
        .set({ 
          status: 'COMPLETED',
          mpesaReceiptNumber: mpesaReceiptNumber
        })
        .where(eq(payments.id, transaction.paymentId));

      // Fetch payment to get saleId
      const payment = await db.query.payments.findFirst({
        where: eq(payments.id, transaction.paymentId)
      });

      if (payment) {
        // Update Sale status to PAID and set amountPaid = totalAmount (assuming full payment for now)
        const sale = await db.query.sales.findFirst({ where: eq(sales.id, payment.referenceId) });
        if (sale) {
           await db.update(sales)
            .set({ 
              paymentStatus: 'PAID', 
              amountPaid: sale.totalAmount,
              mpesaRef: mpesaReceiptNumber
            })
            .where(eq(sales.id, payment.referenceId));
        }
      }

    } else {
      // FAILED (e.g. Cancelled by user, insufficient balance)
      await db.update(mpesaTransactions)
        .set({
          status: 'FAILED',
          resultCode,
          resultDesc
        })
        .where(eq(mpesaTransactions.id, transaction.id));

      await db.update(payments)
        .set({ status: 'FAILED' })
        .where(eq(payments.id, transaction.paymentId));

      // Revert the sale since the STK push failed
      const payment = await db.query.payments.findFirst({
        where: eq(payments.id, transaction.paymentId)
      });
      if (payment && payment.referenceType === 'SALE') {
        await SalesService.deleteFailedSale(payment.referenceId);
      }
    }
  }

  static async querySafaricom(checkoutRequestId: string, businessId: string) {
    const transaction = await db.query.mpesaTransactions.findFirst({
      where: eq(mpesaTransactions.checkoutRequestId, checkoutRequestId)
    });

    if (!transaction) throw new Error("Transaction not found");

    if (transaction.status !== 'PENDING') {
      return { status: transaction.status, resultDesc: transaction.resultDesc };
    }

    try {
      const account = await db.query.businessMpesaAccounts.findFirst({
        where: eq(businessMpesaAccounts.id, transaction.mpesaAccountId)
      });
      if (!account) throw new Error("Account not found");

      const passkey = decrypt(account.passkey);
      const cKey = decrypt(account.consumerKey);
      const cSecret = decrypt(account.consumerSecret);
      const isSandbox = account.environment === 'SANDBOX';
      
      const accessToken = await this.getOAuthToken(cKey, cSecret, isSandbox);
      
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
          CheckoutRequestID: checkoutRequestId
        })
      });
      
      const data = await response.json();

      if (data && data.ResultCode !== undefined && data.ResultCode !== null) {
        if (Number(data.ResultCode) === 0) {
          const fallbackRef = `STK-${checkoutRequestId.slice(-6).toUpperCase()}`;
          await db.update(mpesaTransactions).set({ status: 'COMPLETED', resultCode: 0, resultDesc: data.ResultDesc, transactionCode: fallbackRef }).where(eq(mpesaTransactions.id, transaction.id));
          await db.update(payments).set({ status: 'COMPLETED', mpesaReceiptNumber: fallbackRef }).where(eq(payments.id, transaction.paymentId));
          
          const payment = await db.query.payments.findFirst({ where: eq(payments.id, transaction.paymentId) });
          if (payment) {
            const sale = await db.query.sales.findFirst({ where: eq(sales.id, payment.referenceId) });
            if (sale) {
              await db.update(sales)
                .set({ 
                  paymentStatus: 'PAID', 
                  amountPaid: sale.totalAmount,
                  mpesaRef: fallbackRef
                })
                .where(eq(sales.id, payment.referenceId));
            }
          }
          return { status: 'COMPLETED', resultDesc: data.ResultDesc };
        } else {
          // Any non-zero code is a failure (cancelled, insufficient funds, wrong PIN, timeout, etc.)
          // Re-simulate payload
          const simulatedPayload = {
            Body: {
              stkCallback: {
                MerchantRequestID: data.MerchantRequestID,
                CheckoutRequestID: data.CheckoutRequestID,
                ResultCode: Number(data.ResultCode),
                ResultDesc: data.ResultDesc
              }
            }
          };
          await this.processCallback(simulatedPayload);
          return { status: 'FAILED', resultDesc: data.ResultDesc };
        }
      }
      return { status: 'PENDING' };

    } catch (err: any) {
      // 500.001.1001 = The transaction is being processed
      if (err?.errorCode === '500.001.1001') {
        return { status: 'PENDING' };
      }
      console.warn("STK Query Fallback Error:", err.message);
      return { status: 'PENDING' };
    }
  }
}
