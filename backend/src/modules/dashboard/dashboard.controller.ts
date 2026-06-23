import { Request, Response, NextFunction } from 'express';
import { DashboardService } from './dashboard.service';

export class DashboardController {
  static async getSummary(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await DashboardService.getSummary(req.user!.businessId);
      res.status(200).json({ status: 'success', data });
    } catch (error) {
      next(error);
    }
  }
}
