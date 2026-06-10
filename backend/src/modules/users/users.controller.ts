import { Request, Response } from 'express';
import { UsersService } from './users.service';
import { addUserSchema } from './users.schema';

export class UsersController {
  static async getUsers(req: Request, res: Response) {
    try {
      const businessId = req.user!.businessId;
      const usersList = await UsersService.getUsersByBusinessId(businessId);
      res.json({ success: true, data: usersList });
    } catch (error: any) {
      res.status(500).json({ success: false, error: { message: error.message } });
    }
  }

  static async addCashier(req: Request, res: Response) {
    try {
      // Only OWNER can add a cashier
      if (req.user!.role !== 'OWNER') {
        return res.status(403).json({ success: false, error: { message: 'Only owners can add cashiers.' } });
      }

      const data = addUserSchema.parse(req.body);
      const businessId = req.user!.businessId;
      const newUser = await UsersService.addCashier(data, businessId);
      res.status(201).json({ success: true, data: newUser });
    } catch (error: any) {
      res.status(400).json({ success: false, error: { message: error.message } });
    }
  }
}
