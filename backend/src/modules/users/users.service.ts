import { eq, and } from 'drizzle-orm';
import { db } from '../../db';
import { users, customers } from '../../db/schema';
import { AddUserInput } from './users.schema';
import { AppError } from '../../core/utils/AppError';
import { CustomersService } from '../customers/customers.service';

export class UsersService {
  static async getUsersByBusinessId(businessId: string, limit = 50, offset = 0) {
    return db.select({
      id: users.id,
      email: users.email,
      firstName: users.firstName,
      lastName: users.lastName,
      mobileNumber: users.mobileNumber,
      role: users.role,
      isActive: users.isActive,
      createdAt: users.createdAt,
    })
    .from(users)
    .where(eq(users.businessId, businessId))
    .orderBy(users.createdAt)
    .limit(limit)
    .offset(offset);
  }

  static async addCashier(data: AddUserInput, businessId: string) {
    // Check if user already exists across the platform
    const [existing] = await db.select().from(users).where(eq(users.email, data.email));
    if (existing) {
      throw new AppError('User with this email already exists.', 400);
    }

    const [newUser] = await db.insert(users).values({
      email: data.email,
      firstName: data.firstName,
      lastName: data.lastName,
      mobileNumber: data.mobileNumber,
      businessId,
      role: data.role || 'CASHIER',
    }).returning({
      id: users.id,
      email: users.email,
      firstName: users.firstName,
      lastName: users.lastName,
      mobileNumber: users.mobileNumber,
      role: users.role,
      isActive: users.isActive,
      createdAt: users.createdAt,
    });
    
    // Automatically create employee customer record for credit tracking
    const fullName = `${data.firstName || ''} ${data.lastName || ''}`.trim() || data.email;
    const [existingCust] = await db.select().from(customers)
      .where(and(eq(customers.businessId, businessId), eq(customers.name, fullName)));

    if (!existingCust) {
      await db.insert(customers).values({
        businessId,
        name: fullName,
        phone: data.mobileNumber || undefined,
        notes: `System User (${data.email})`,
        type: 'EMPLOYEE',
      }).catch(() => {});
    }

    await CustomersService.invalidateCustomerCache(businessId);

    return newUser;
  }

  static async updateUserRole(businessId: string, id: string, role: 'CASHIER' | 'MANAGER' | 'OWNER') {
    const [updated] = await db
      .update(users)
      .set({ role })
      .where(and(eq(users.id, id), eq(users.businessId, businessId)))
      .returning({
        id: users.id,
        email: users.email,
        role: users.role,
      });

    return updated;
  }
}
