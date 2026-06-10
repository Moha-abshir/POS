import { eq } from 'drizzle-orm';
import { db } from '../../db';
import { users } from '../../db/schema';
import { AddUserInput } from './users.schema';

export class UsersService {
  static async getUsersByBusinessId(businessId: string) {
    return db.select({
      id: users.id,
      email: users.email,
      role: users.role,
      isActive: users.isActive,
      createdAt: users.createdAt,
    })
    .from(users)
    .where(eq(users.businessId, businessId))
    .orderBy(users.createdAt);
  }

  static async addCashier(data: AddUserInput, businessId: string) {
    // Check if user already exists across the platform
    const [existing] = await db.select().from(users).where(eq(users.email, data.email));
    if (existing) {
      throw new Error('User with this email already exists.');
    }

    const [newUser] = await db.insert(users).values({
      email: data.email,
      businessId,
      role: 'CASHIER',
    }).returning({
      id: users.id,
      email: users.email,
      role: users.role,
      isActive: users.isActive,
      createdAt: users.createdAt,
    });
    
    return newUser;
  }
}
