import { Request, Response, NextFunction } from 'express';
import { NotificationsService } from './notifications.service';

export class NotificationsController {
  static async getNotifications(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await NotificationsService.getNotifications(req.user!.businessId, req.user!.role);
      res.status(200).json({ status: 'success', data });
    } catch (error) {
      next(error);
    }
  }

  static async getUnreadCount(req: Request, res: Response, next: NextFunction) {
    try {
      const count = await NotificationsService.getUnreadCount(req.user!.businessId, req.user!.role);
      res.status(200).json({ status: 'success', count });
    } catch (error) {
      next(error);
    }
  }

  static async markAsRead(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const data = await NotificationsService.markAsRead(id as string, req.user!.businessId);
      if (!data) {
        return res.status(404).json({ status: 'error', message: 'Notification not found' });
      }
      res.status(200).json({ status: 'success', data });
    } catch (error) {
      next(error);
    }
  }

  static async markAllAsRead(req: Request, res: Response, next: NextFunction) {
    try {
      await NotificationsService.markAllAsRead(req.user!.businessId, req.user!.role);
      res.status(200).json({ status: 'success', message: 'All notifications marked as read' });
    } catch (error) {
      next(error);
    }
  }
}
