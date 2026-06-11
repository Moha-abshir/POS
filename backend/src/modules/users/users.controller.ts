import { Request, Response, NextFunction } from 'express';
import { UsersService } from './users.service';
import { addUserSchema } from './users.schema';

export class UsersController {
  static async getUsers(req: Request, res: Response, next: NextFunction) {
    try {
      const businessId = req.user!.businessId;
      const limit = parseInt(req.query.limit as string) || 50;
      const offset = parseInt(req.query.offset as string) || 0;
      const usersList = await UsersService.getUsersByBusinessId(businessId, limit, offset);
      res.json({ success: true, data: usersList });
    } catch (error) {
      next(error);
    }
  }

  static async addCashier(req: Request, res: Response, next: NextFunction) {
    try {
      // Only OWNER can add a cashier
      if (req.user!.role !== 'OWNER') {
        return res.status(403).json({ success: false, error: { message: 'Only owners can add cashiers.' } });
      }

      const data = addUserSchema.parse(req.body);
      const businessId = req.user!.businessId;
      const newUser = await UsersService.addCashier(data, businessId);
      res.status(201).json({ success: true, data: newUser });
    } catch (error) {
      next(error);
    }
  }
}
