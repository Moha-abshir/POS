import { Request, Response } from 'express';
import { MpesaService } from './mpesa.service';
import { createMpesaAccountSchema, updateMpesaAccountSchema } from './mpesa.schema';
import { ZodError } from 'zod';

export class MpesaSettingsController {
  static async getAccounts(req: Request, res: Response) {
    try {
      const accounts = await MpesaService.getAccounts(req.user!.businessId);
      res.json(accounts);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  }

  static async createAccount(req: Request, res: Response) {
    try {
      const validatedData = createMpesaAccountSchema.parse(req.body);
      const account = await MpesaService.createAccount(req.user!.businessId, req.user!.id, validatedData);
      res.status(201).json(account);
    } catch (error: any) {
      const message = error instanceof ZodError 
        ? error.issues.map((e: any) => `${e.path.join('.')}: ${e.message}`).join(', ')
        : error.message;
      res.status(400).json({ message });
    }
  }

  static async updateAccount(req: Request, res: Response) {
    try {
      const validatedData = updateMpesaAccountSchema.parse(req.body);
      const account = await MpesaService.updateAccount(req.user!.businessId, req.params.id as string, req.user!.id, validatedData);
      if (!account) return res.status(404).json({ message: 'Account not found' });
      res.json(account);
    } catch (error: any) {
      const message = error instanceof ZodError 
        ? error.issues.map((e: any) => `${e.path.join('.')}: ${e.message}`).join(', ')
        : error.message;
      res.status(400).json({ message });
    }
  }

  static async deleteAccount(req: Request, res: Response) {
    try {
      const account = await MpesaService.deleteAccount(req.user!.businessId, req.params.id as string, req.user!.id);
      if (!account) return res.status(404).json({ message: 'Account not found' });
      res.json({ message: 'Account deleted successfully' });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  }

  static async setDefaultAccount(req: Request, res: Response) {
    try {
      const account = await MpesaService.setDefaultAccount(req.user!.businessId, req.params.id as string, req.user!.id);
      if (!account) return res.status(404).json({ message: 'Account not found' });
      res.json(account);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  }

  static async revealCredentials(req: Request, res: Response) {
    try {
      const credentials = await MpesaService.revealCredentials(req.user!.businessId, req.params.id as string);
      if (!credentials) return res.status(404).json({ message: 'Account not found' });
      res.json(credentials);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  }
}
