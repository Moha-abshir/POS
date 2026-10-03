import { Request, Response, NextFunction } from 'express';
import { CashSessionsService } from './cash-sessions.service';
import { flushPattern } from '../../core/cache/redis';

export class CashSessionsController {
  static async getActive(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await CashSessionsService.getActiveSession(req.user!.businessId, req.user!.id);
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
      await flushPattern(`cache:${req.user!.businessId}:*cash-sessions*`);
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
      await flushPattern(`cache:${req.user!.businessId}:*cash-sessions*`);
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

  static async resolveDiscrepancy(req: Request, res: Response, next: NextFunction) {
    try {
      if (req.user!.role !== 'OWNER') {
        return res.status(403).json({ status: 'error', message: 'Only store owners are allowed to resolve discrepancies' });
      }

      const id = req.params.id as string;
      const { resolutionType, notes } = req.body;

      if (!resolutionType) {
        return res.status(400).json({ status: 'error', message: 'Resolution type is required' });
      }

      const data = await CashSessionsService.resolveSessionDiscrepancy(
        req.user!.businessId,
        req.user!.id,
        id,
        { resolutionType, notes }
      );
      await flushPattern(`cache:${req.user!.businessId}:*cash-sessions*`);
      res.status(200).json({ status: 'success', data });
    } catch (error: any) {
      res.status(400).json({ status: 'error', message: error.message });
    }
  }
}
