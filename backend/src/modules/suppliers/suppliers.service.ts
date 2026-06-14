import { eq, and, asc, desc, ilike, or } from 'drizzle-orm';
import { db } from '../../db';
import { suppliers } from '../../db/schema';
import { AppError } from '../../core/utils/AppError';

export class SuppliersService {
  static async getSuppliers(businessId: string, search?: string) {
    const conditions: any[] = [eq(suppliers.businessId, businessId), eq(suppliers.isActive, true)];
    
    if (search) {
      const searchPattern = `%${search}%`;
      conditions.push(or(
        ilike(suppliers.name, searchPattern),
        ilike(suppliers.phone, searchPattern),
        ilike(suppliers.email, searchPattern)
      ));
    }
    
    return await db.select()
      .from(suppliers)
      .where(and(...conditions))
      .orderBy(asc(suppliers.name));
  }

  static async getSupplierById(businessId: string, supplierId: string) {
    const [supplier] = await db.select()
      .from(suppliers)
      .where(and(eq(suppliers.id, supplierId), eq(suppliers.businessId, businessId)));

    if (!supplier) {
      throw new AppError('Supplier not found', 404);
    }

    return supplier;
  }

  static async createSupplier(businessId: string, userId: string, data: { name: string; phone?: string; email?: string }) {
    const [supplier] = await db.insert(suppliers).values({
      businessId,
      name: data.name,
      phone: data.phone,
      email: data.email,
      createdBy: userId,
    }).returning();

    return supplier;
  }

  static async updateSupplier(businessId: string, supplierId: string, data: { name?: string; phone?: string; email?: string; isActive?: boolean }) {
    const updateData: any = { updatedAt: new Date() };
    if (data.name !== undefined) updateData.name = data.name;
    if (data.phone !== undefined) updateData.phone = data.phone;
    if (data.email !== undefined) updateData.email = data.email;
    if (data.isActive !== undefined) updateData.isActive = data.isActive;

    const [supplier] = await db.update(suppliers)
      .set(updateData)
      .where(and(eq(suppliers.id, supplierId), eq(suppliers.businessId, businessId)))
      .returning();

    if (!supplier) {
      throw new AppError('Supplier not found', 404);
    }

    return supplier;
  }
}
