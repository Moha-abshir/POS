import { eq, and, asc, desc, ilike, or } from 'drizzle-orm';
import { db } from '../../db';
import { suppliers } from '../../db/schema';
import { AppError } from '../../core/utils/AppError';

export class SuppliersService {
  static async getSuppliers(businessId: string, search?: string) {
    let query = db.select().from(suppliers).where(and(eq(suppliers.businessId, businessId), eq(suppliers.isActive, true)));
    
    // We will do filtering in-memory if search is provided for simplicity, or we can use ilike
    const results = await query.orderBy(asc(suppliers.name));
    
    if (search) {
      const lowerSearch = search.toLowerCase();
      return results.filter(s => s.name.toLowerCase().includes(lowerSearch) || s.phone?.includes(lowerSearch) || s.email?.toLowerCase().includes(lowerSearch));
    }
    return results;
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
    const [supplier] = await db.update(suppliers)
      .set({ ...data, updatedAt: new Date() })
      .where(and(eq(suppliers.id, supplierId), eq(suppliers.businessId, businessId)))
      .returning();

    if (!supplier) {
      throw new AppError('Supplier not found', 404);
    }

    return supplier;
  }
}
