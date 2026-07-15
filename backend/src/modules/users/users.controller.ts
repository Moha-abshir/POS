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

  static async updateRole(req: Request, res: Response, next: NextFunction) {
    try {
      // Only OWNER can update roles
      if (req.user!.role !== 'OWNER') {
        return res.status(403).json({ success: false, error: { message: 'Only owners can change user roles.' } });
      }

      const id = req.params.id as string;
      const { role } = req.body;

      if (!['CASHIER', 'MANAGER', 'OWNER'].includes(role)) {
        return res.status(400).json({ success: false, error: { message: 'Invalid role. Must be CASHIER, MANAGER, or OWNER.' } });
      }

      const updated = await UsersService.updateUserRole(req.user!.businessId, id, role);
      if (!updated) {
        return res.status(404).json({ success: false, error: { message: 'User not found.' } });
      }

      res.json({ success: true, data: updated });
    } catch (error) {
      next(error);
    }
  }
}
