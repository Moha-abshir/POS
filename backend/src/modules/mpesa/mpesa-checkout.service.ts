import { eq, and, isNull } from 'drizzle-orm';
import { db } from '../../db';
import { businessMpesaAccounts, payments, mpesaTransactions, sales } from '../../db/schema';
import { decrypt } from '../../core/utils/crypto.util';
import crypto from 'crypto';

export class MpesaCheckoutService {
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
    const checkoutRequestId = `ws_CO_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;

    // 3. Create Payment Record (Generic)
    const [payment] = await db.insert(payments).values({
      referenceType: 'SALE',
      referenceId: saleId,
      businessId,
      method: 'MPESA',
      amount: amount.toString(),
      status: 'PENDING'
    }).returning();

    // 4. Create M-Pesa Transaction Record
    const [transaction] = await db.insert(mpesaTransactions).values({
      paymentId: payment.id,
      mpesaAccountId: account.id,
      checkoutRequestId,
      phoneNumber,
      amount: amount.toString(),
      status: 'PENDING'
    }).returning();

    // 5. Mock Daraja API Call if Sandbox
    if (isSandbox) {
      // Simulate Safaricom Delay and Webhook
      setTimeout(async () => {
        // Simulate Success Callback payload
        const mockCallback = {
          Body: {
            stkCallback: {
              MerchantRequestID: "MockMerchantId",
              CheckoutRequestID: checkoutRequestId,
              ResultCode: 0,
              ResultDesc: "The service request is processed successfully.",
              CallbackMetadata: {
                Item: [
                  { Name: "Amount", Value: amount },
                  { Name: "MpesaReceiptNumber", Value: "QFE" + Math.floor(Math.random() * 100000) },
                  { Name: "PhoneNumber", Value: phoneNumber }
                ]
              }
            }
          }
        };

        // Post to our own webhook
        try {
          await fetch(`http://localhost:${process.env.PORT || 5000}/mpesa/webhook/callback`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(mockCallback)
          });
        } catch (e) {
          console.error("Failed to hit mock webhook", e);
        }

      }, 3000); // 3 seconds delay for PIN entry
    } else {
      // TODO: Implement actual Safaricom STK Push HTTP request here using cKey, cSecret, passkey
      throw new Error("Production Daraja API not yet implemented");
    }

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

    if (!transaction) throw new Error("Transaction not found");

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
        .set({ status: 'COMPLETED' })
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
            .set({ paymentStatus: 'PAID', amountPaid: sale.totalAmount })
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
    }
  }
}
