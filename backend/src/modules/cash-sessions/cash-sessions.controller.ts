import { Request, Response, NextFunction } from 'express';
import { CashSessionsService } from './cash-sessions.service';

export class CashSessionsController {
  static async getActive(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await CashSessionsService.getActiveSession(req.user!.businessId);
      res.status(200).json({ status: 'success', data });
    } catch (error) {
      next(error);
    }
  }

  static async open(req: Request, res: Response, next: NextFunction) {
    try {
      const { openingFloat } = req.body;
      if (openingFloat === undefined || Number(openingFloat) < 0) {
        return res.status(400).json({ status: 'error', message: 'A valid non-negative opening float is required' });
      }
      const data = await CashSessionsService.openSession(
        req.user!.businessId,
        req.user!.id,
        Number(openingFloat)
      );
      res.status(200).json({ status: 'success', data });
    } catch (error: any) {
      res.status(400).json({ status: 'error', message: error.message });
    }
  }

  static async close(req: Request, res: Response, next: NextFunction) {
    try {
      const { denominationCounts, actualCash, notes } = req.body;
      if (!denominationCounts || actualCash === undefined || Number(actualCash) < 0) {
        return res.status(400).json({ status: 'error', message: 'Denomination counts and a non-negative actual cash count are required' });
      }
      const data = await CashSessionsService.closeSession(
        req.user!.businessId,
        req.user!.id,
        denominationCounts,
        Number(actualCash),
        notes
      );
      res.status(200).json({ status: 'success', data });
    } catch (error: any) {
      res.status(400).json({ status: 'error', message: error.message });
    }
  }

  static async getHistory(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await CashSessionsService.getHistory(req.user!.businessId);
      res.status(200).json({ status: 'success', data });
    } catch (error) {
      next(error);
    }
  }
}
