import { eq, and, gt, desc, sql, count } from 'drizzle-orm';
import { db } from '../../db';
import { admins, otps, businesses, users } from '../../db/schema';
import crypto from 'crypto';
import argon2 from 'argon2';
import jwt from 'jsonwebtoken';
import { EmailService } from '../../core/services/email.service';
import { AppError } from '../../core/utils/AppError';

const JWT_SECRET = process.env.JWT_SECRET!;

export class AdminService {
  static async requestOtp(email: string) {
    // 1. Verify email belongs to an admin
    const [admin] = await db.select().from(admins).where(eq(admins.email, email));
    if (!admin) {
      throw new AppError('Unauthorized: Email is not registered as an administrator', 403);
    }

    // 2. Invalidate old OTPs for this email
    await db.update(otps)
      .set({ used: true })
      .where(and(eq(otps.email, email), eq(otps.used, false)));

    // 3. Generate 6 digit OTP
    const otp = crypto.randomInt(100000, 999999).toString();
    console.log(`[OTP-DEBUG] Email: ${email}  ${otp}`);

    // 4. Hash it with argon2
    const codeHash = await argon2.hash(otp);

    // 5. Expiry is 5 minutes from now
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

    // 6. Save to DB
    await db.insert(otps).values({
      email,
      codeHash,
      expiresAt,
    });

    // 7. Send Email
    await EmailService.sendOtpEmail(email, otp);
  }

  static async verifyOtp(email: string, otp: string) {
    return await db.transaction(async (tx) => {
      // 1. Find the latest unexpired, unused OTP for this email
      const [otpRecord] = await tx.select()
        .from(otps)
        .where(and(
          eq(otps.email, email),
          eq(otps.used, false),
          gt(otps.expiresAt, new Date())
        ))
        .orderBy(desc(otps.createdAt))
        .limit(1);

      if (!otpRecord) {
        throw new AppError('Invalid or expired OTP', 400);
      }

      if (otpRecord.attempts >= 5) {
        throw new AppError('Too many attempts. Please request a new OTP.', 400);
      }

      // 2. Verify hash
      const isValid = await argon2.verify(otpRecord.codeHash, otp);

      if (!isValid) {
        await tx.update(otps)
          .set({ attempts: sql`${otps.attempts} + 1` })
          .where(eq(otps.id, otpRecord.id));
        throw new AppError('Invalid OTP', 400);
      }

      // 3. Mark OTP as used
      await tx.update(otps)
        .set({ used: true })
        .where(eq(otps.id, otpRecord.id));

      // 4. Find Admin
      const [admin] = await tx.select().from(admins).where(eq(admins.email, email));
      if (!admin) {
        throw new AppError('Admin profile not found', 404);
      }

      // 5. Update last login
      await tx.update(admins)
        .set({ lastLoginAt: new Date() })
        .where(eq(admins.id, admin.id));

      // 6. Generate Token with type admin
      const accessToken = jwt.sign(
        {
          sub: admin.id,
          adminId: admin.id,
          email: admin.email,
          role: admin.role,
          type: 'admin'
        },
        JWT_SECRET,
        { expiresIn: '30d' } // Admin session valid for 30 days
      );

      return {
        accessToken,
        admin: {
          id: admin.id,
          name: admin.name,
          email: admin.email,
          role: admin.role,
          type: 'admin' as const
        }
      };
    });
  }

  static async getMetrics() {
    // 1. Counts of businesses by status
    const [pendingCount] = await db.select({ val: count() }).from(businesses).where(eq(businesses.status, 'pending'));
    const [activeCount] = await db.select({ val: count() }).from(businesses).where(eq(businesses.status, 'active'));
    const [suspendedCount] = await db.select({ val: count() }).from(businesses).where(eq(businesses.status, 'suspended'));
    const [rejectedCount] = await db.select({ val: count() }).from(businesses).where(eq(businesses.status, 'rejected'));
    const [totalCount] = await db.select({ val: count() }).from(businesses);

    // 2. Count owners and cashiers
    const [ownersCount] = await db.select({ val: count() }).from(users).where(eq(users.role, 'OWNER'));
    const [cashiersCount] = await db.select({ val: count() }).from(users).where(eq(users.role, 'CASHIER'));

    // 3. Recent registrations (last 5) join owner details
    const recentRegistrations = await db.select({
      id: businesses.id,
      name: businesses.name,
      createdAt: businesses.createdAt,
      status: businesses.status,
      ownerName: sql<string>`CONCAT(${users.firstName}, ' ', ${users.lastName})`,
      ownerEmail: users.email,
    })
    .from(businesses)
    .leftJoin(users, and(eq(users.businessId, businesses.id), eq(users.role, 'OWNER')))
    .orderBy(desc(businesses.createdAt))
    .limit(5);

    return {
      businesses: {
        pending: pendingCount.val,
        active: activeCount.val,
        suspended: suspendedCount.val,
        rejected: rejectedCount.val,
        total: totalCount.val
      },
      users: {
        owners: ownersCount.val,
        cashiers: cashiersCount.val,
        total: ownersCount.val + cashiersCount.val
      },
      recentRegistrations
    };
  }

  static async getBusinesses(statusFilter?: string) {
    let query = db.select({
      id: businesses.id,
      name: businesses.name,
      sector: businesses.sector,
      phone: businesses.phone,
      location: businesses.location,
      status: businesses.status,
      createdAt: businesses.createdAt,
      approvedAt: businesses.approvedAt,
      approvedBy: businesses.approvedBy,
      approvedByName: admins.name,
      ownerName: sql<string>`CONCAT(${users.firstName}, ' ', ${users.lastName})`,
      ownerEmail: users.email,
      ownerPhone: users.mobileNumber,
    })
    .from(businesses)
    .leftJoin(users, and(eq(users.businessId, businesses.id), eq(users.role, 'OWNER')))
    .leftJoin(admins, eq(businesses.approvedBy, admins.id));

    if (statusFilter && statusFilter !== 'all') {
      query = query.where(eq(businesses.status, statusFilter)) as any;
    }

    return await query.orderBy(desc(businesses.createdAt));
  }

  static async approveBusiness(businessId: string, adminId: string) {
    const [business] = await db.select().from(businesses).where(eq(businesses.id, businessId));
    if (!business) throw new AppError('Business not found', 404);
    if (business.status !== 'pending' && business.status !== 'rejected') {
      throw new AppError('Business is not in pending or rejected status', 400);
    }

    const [updated] = await db.update(businesses)
      .set({
        status: 'active',
        approvedAt: new Date(),
        approvedBy: adminId,
        updatedAt: new Date()
      })
      .where(eq(businesses.id, businessId))
      .returning();

    return updated;
  }

  static async rejectBusiness(businessId: string) {
    const [business] = await db.select().from(businesses).where(eq(businesses.id, businessId));
    if (!business) throw new AppError('Business not found', 404);
    if (business.status !== 'pending') {
      throw new AppError('Only pending businesses can be rejected', 400);
    }

    const [updated] = await db.update(businesses)
      .set({
        status: 'rejected',
        approvedAt: null,
        approvedBy: null,
        updatedAt: new Date()
      })
      .where(eq(businesses.id, businessId))
      .returning();

    return updated;
  }

  static async suspendBusiness(businessId: string) {
    const [business] = await db.select().from(businesses).where(eq(businesses.id, businessId));
    if (!business) throw new AppError('Business not found', 404);
    if (business.status !== 'active') {
      throw new AppError('Only active businesses can be suspended', 400);
    }

    const [updated] = await db.update(businesses)
      .set({
        status: 'suspended',
        updatedAt: new Date()
      })
      .where(eq(businesses.id, businessId))
      .returning();

    return updated;
  }

  static async reactivateBusiness(businessId: string) {
    const [business] = await db.select().from(businesses).where(eq(businesses.id, businessId));
    if (!business) throw new AppError('Business not found', 404);
    if (business.status !== 'suspended') {
      throw new AppError('Only suspended businesses can be reactivated', 400);
    }

    const [updated] = await db.update(businesses)
      .set({
        status: 'active',
        updatedAt: new Date()
      })
      .where(eq(businesses.id, businessId))
      .returning();

    return updated;
  }

  static async deleteBusiness(businessId: string) {
    const [business] = await db.select().from(businesses).where(eq(businesses.id, businessId));
    if (!business) throw new AppError('Business not found', 404);

    const [deleted] = await db.delete(businesses)
      .where(eq(businesses.id, businessId))
      .returning();

    return deleted;
  }
}
