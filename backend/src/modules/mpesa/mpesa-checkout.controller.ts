import { Request, Response } from 'express';
import { MpesaCheckoutService } from './mpesa-checkout.service';
import { z } from 'zod';

const pushSchema = z.object({
  saleId: z.string().uuid(),
  phoneNumber: z.string().min(10),
  amount: z.number().positive()
});

export class MpesaCheckoutController {
  static async initiatePush(req: Request, res: Response) {
    try {
      const validatedData = pushSchema.parse(req.body);
      const result = await MpesaCheckoutService.initiateSTKPush(
        req.user!.businessId, 
        validatedData.saleId, 
        validatedData.phoneNumber, 
        validatedData.amount
      );
      res.json(result);
    } catch (error: any) {
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

  static async handleCallback(req: Request, res: Response) {
    try {
      await MpesaCheckoutService.processCallback(req.body);
      // Safaricom expects a success response immediately
      res.json({ ResultCode: 0, ResultDesc: "Accepted" });
    } catch (error: any) {
      console.error('M-Pesa Webhook Error:', error);
      res.status(500).json({ ResultCode: 1, ResultDesc: "Error" });
    }
  }
}
