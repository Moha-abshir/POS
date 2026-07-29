import { Request, Response } from 'express';
import { db } from '../../db';
import { businesses } from '../../db/schema';
import { eq } from 'drizzle-orm';
import { AppError } from '../../core/utils/AppError';

export class BusinessesController {
  static async enableBanking(req: Request, res: Response) {
    const businessId = req.user?.businessId;
    if (!businessId) throw new AppError('Unauthorized', 401);

    const [updated] = await db.update(businesses)
      .set({ isBankingEnabled: true })
      .where(eq(businesses.id, businessId))
      .returning();

    res.json({ message: 'Banking feature enabled successfully', isBankingEnabled: updated.isBankingEnabled });
  }
}
