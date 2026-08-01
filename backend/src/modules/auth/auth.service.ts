import { eq, and, gt, desc, sql } from 'drizzle-orm';
import { db } from '../../db';
import { users, otps, sessions, businesses, products, sales } from '../../db/schema';
import argon2 from 'argon2';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { EmailService } from '../../core/services/email.service';
import { AppError } from '../../core/utils/AppError';

const JWT_SECRET = process.env.JWT_SECRET!;

export class AuthService {
  static async requestOtp(email: string) {
    // 0. Invalidate old OTPs
    await db.update(otps)
      .set({ used: true })
      .where(and(eq(otps.email, email), eq(otps.used, false)));

    // 1. Generate 6 digit OTP
    const otp = crypto.randomInt(100000, 999999).toString();

    // 2. Hash it
    const codeHash = await argon2.hash(otp);

    // 3. Expiry is 5 minutes from now
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

    // 4. Save to DB
    await db.insert(otps).values({
      email,
      codeHash,
      expiresAt,
    });

    // 5. Send Email
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
        // Increment attempts atomically
        await tx.update(otps)
          .set({ attempts: sql`${otps.attempts} + 1` })
          .where(eq(otps.id, otpRecord.id));
        throw new AppError('Invalid OTP', 400);
      }

      // 3. Mark OTP as used atomically
      const [updatedOtp] = await tx.update(otps)
        .set({ used: true })
        .where(and(eq(otps.id, otpRecord.id), eq(otps.used, false)))
        .returning();

      if (!updatedOtp) {
        throw new AppError('OTP already used', 400);
      }

      // 4. Find or Create User
      let [user] = await tx.select().from(users).where(eq(users.email, email));
      let businessId: string;
      let isSetupComplete = false;
      let isBankingEnabled = false;
      let businessName = 'Smart Store POS';
      let businessStatus = 'pending';

      if (!user) {
        const [newBusiness] = await tx.insert(businesses).values({
          name: 'Smart Store POS'
        }).returning();

        businessId = newBusiness.id;
        isSetupComplete = newBusiness.isSetupComplete;
        isBankingEnabled = newBusiness.isBankingEnabled;
        businessStatus = newBusiness.status;

        const [newUser] = await tx.insert(users).values({
          email,
          businessId: newBusiness.id,
          role: 'OWNER'
        }).returning();

        user = newUser;
      } else {
        if (!user.isActive) {
          throw new AppError('User account is deactivated', 403);
        }
        businessId = user.businessId;
        const [business] = await tx.select().from(businesses).where(eq(businesses.id, businessId));
        if (business) {
          isSetupComplete = business.isSetupComplete;
          isBankingEnabled = business.isBankingEnabled;
          businessName = business.name;
          businessStatus = business.status;
        }
      }

      // 5. Generate Access Token (JWT) - 7 days
      const accessToken = jwt.sign(
        { sub: user.id, email: user.email, role: user.role, businessId: user.businessId },
        JWT_SECRET,
        { expiresIn: '7d' }
      );

      // 6. Generate Refresh Token - 7 days
      const rawRefreshToken = crypto.randomBytes(64).toString('hex');
      const refreshTokenHash = crypto.createHash('sha256').update(rawRefreshToken).digest('hex');
      const refreshExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

      await tx.insert(sessions).values({
        userId: user.id,
        businessId: user.businessId,
        refreshTokenHash,
        expiresAt: refreshExpiresAt,
      });

      return {
        accessToken,
        refreshToken: rawRefreshToken,
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          mobileNumber: user.mobileNumber,
          role: user.role,
          businessId: user.businessId,
          businessName,
          isSetupComplete,
          isBankingEnabled,
          businessStatus
        }
      };
    });
  }

  static async onboarding(userId: string, data: {
    firstName: string;
    lastName: string;
    mobileNumber: string;
    organizationName: string;
    sector: string;
    businessPhone: string;
    location: string;
    productMode?: 'ADVANCED' | 'SIMPLE';
  }) {
    // Get user to find businessId
    const [user] = await db.select().from(users).where(eq(users.id, userId));
    if (!user) throw new AppError('User not found', 404);

    // Update user personal details
    await db.update(users)
      .set({
        firstName: data.firstName,
        lastName: data.lastName,
        mobileNumber: data.mobileNumber,
        updatedAt: new Date()
      })
      .where(eq(users.id, userId));

    // Update business details
    await db.update(businesses)
      .set({
        name: data.organizationName,
        sector: data.sector,
        phone: data.businessPhone,
        location: data.location,
        productMode: data.productMode || 'ADVANCED',
        isSetupComplete: true,
        updatedAt: new Date()
      })
      .where(eq(businesses.id, user.businessId));
  }


  static async logout(userId: string, rawRefreshToken: string) {
    const refreshTokenHash = crypto.createHash('sha256').update(rawRefreshToken).digest('hex');
    await db.update(sessions).set({ revoked: true }).where(and(eq(sessions.userId, userId), eq(sessions.refreshTokenHash, refreshTokenHash)));
  }

  static async refreshSession(rawRefreshToken: string) {
    const refreshTokenHash = crypto.createHash('sha256').update(rawRefreshToken).digest('hex');

    const [session] = await db.select().from(sessions).where(eq(sessions.refreshTokenHash, refreshTokenHash));

    if (!session || session.revoked || session.expiresAt < new Date()) {
      throw new AppError('Invalid or expired refresh token', 401);
    }

    const [user] = await db.select().from(users).where(eq(users.id, session.userId));
    if (!user || !user.isActive) {
      throw new AppError('User inactive or not found', 401);
    }

    const accessToken = jwt.sign(
      { sub: user.id, email: user.email, role: user.role, businessId: user.businessId },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    return accessToken;
  }

  static async me(userId: string) {
    const [user] = await db.select({
      id: users.id,
      email: users.email,
      firstName: users.firstName,
      lastName: users.lastName,
      mobileNumber: users.mobileNumber,
      role: users.role,
      businessId: users.businessId,
      isActive: users.isActive,
    }).from(users).where(eq(users.id, userId));

    if (!user) {
      throw new AppError('User not found', 404);
    }

    const [business] = await db.select().from(businesses).where(eq(businesses.id, user.businessId));

    return { user, business };
  }

  static async updateBusinessSettings(businessId: string, productMode: 'SIMPLE' | 'ADVANCED') {
    // 1. Get current business
    const [business] = await db.select().from(businesses).where(eq(businesses.id, businessId));
    if (!business) throw new AppError('Business not found', 404);

    if (business.productMode === productMode) {
      return business; // No change
    }

    // 2. Enforce lock: once SIMPLE, cannot switch back to ADVANCED
    if (business.productMode === 'SIMPLE' && productMode === 'ADVANCED') {
      throw new AppError('Once Simple Mode is selected, you cannot switch back to Advanced Mode.', 400);
    }

    // 3. Enforce lock: once ADVANCED and has products/sales, cannot switch to SIMPLE
    if (business.productMode === 'ADVANCED' && productMode === 'SIMPLE') {
      // Check if they have any products
      const [productCheck] = await db.select({ count: sql`count(*)` }).from(products).where(eq(products.businessId, businessId));
      const productCount = Number(productCheck?.count || 0);

      // Check if they have any sales
      const [salesCheck] = await db.select({ count: sql`count(*)` }).from(sales).where(eq(sales.businessId, businessId));
      const salesCount = Number(salesCheck?.count || 0);

      if (productCount > 0 || salesCount > 0) {
        throw new AppError('Cannot switch to Simple Mode: You already have active products or sales transactions.', 400);
      }
    }

    // 4. Perform update
    const [updated] = await db.update(businesses)
      .set({ productMode, updatedAt: new Date() })
      .where(eq(businesses.id, businessId))
      .returning();

    return updated;
  }
}
