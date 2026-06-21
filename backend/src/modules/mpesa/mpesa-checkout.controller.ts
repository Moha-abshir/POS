import { Request, Response } from 'express';
import { MpesaCheckoutService } from './mpesa-checkout.service';
import { z } from 'zod';
import { SalesService } from '../sales/sales.service';

const pushSchema = z.object({
  saleId: z.string().uuid().optional(),
  customerId: z.string().uuid().optional(),
  phoneNumber: z.string().min(10),
  amount: z.number().positive()
});

export class MpesaCheckoutController {
  static async initiatePush(req: Request, res: Response) {
    try {
      const validatedData = pushSchema.parse(req.body);

      if (!validatedData.saleId && !validatedData.customerId) {
        return res.status(400).json({ message: "Either saleId or customerId is required" });
      }

      const referenceType = validatedData.saleId ? 'SALE' : 'CUSTOMER_DEBT';
      const referenceId = (validatedData.saleId || validatedData.customerId)!;

      const result = await MpesaCheckoutService.initiateSTKPush(
        req.user!.businessId, 
        referenceType,
        referenceId, 
        validatedData.phoneNumber, 
        validatedData.amount
      );
      res.json(result);
    } catch (error: any) {
      if (req.body.saleId) {
        try {
          await SalesService.deleteFailedSale(req.body.saleId);
        } catch (rollbackError) {
          console.error('Failed to rollback sale:', rollbackError);
        }
      }
      res.status(400).json({ message: error.errors || error.message });
    }
  }

  static async checkStatus(req: Request, res: Response) {
    try {
      const status = await MpesaCheckoutService.checkStatus(req.params.id as string, req.user!.businessId);
      res.json(status);
    } catch (error: any) {
      res.status(404).json({ message: error.message });
    }
  }

  static async queryStatus(req: Request, res: Response) {
    try {
      const status = await MpesaCheckoutService.querySafaricom(req.params.id as string, req.user!.businessId);
      res.json(status);
    } catch (error: any) {
      res.status(404).json({ message: error.message });
    }
  }

  static async handleCallback(req: Request, res: Response) {
    try {
      // Validate secure webhook token if configured in environment variables to prevent spoofing
      const webhookToken = process.env.MPESA_WEBHOOK_TOKEN;
      if (webhookToken && req.query.token !== webhookToken) {
        console.warn('Unauthorized M-Pesa webhook callback attempt blocked.');
        return res.status(401).json({ ResultCode: 1, ResultDesc: "Unauthorized Callback" });
      }

      await MpesaCheckoutService.processCallback(req.body);
      // Safaricom expects a success response immediately
      res.json({ ResultCode: 0, ResultDesc: "Accepted" });
    } catch (error: any) {
      console.error('M-Pesa Webhook Error:', error);
      res.status(500).json({ ResultCode: 1, ResultDesc: "Error" });
    }
  }
}
