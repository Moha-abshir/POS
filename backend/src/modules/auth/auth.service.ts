import { eq, and, gt, desc } from 'drizzle-orm';
import { db } from '../../db';
import { users, otps, sessions, businesses } from '../../db/schema';
import argon2 from 'argon2';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { EmailService } from '../../core/services/email.service';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret';

export class AuthService {
  static async requestOtp(email: string) {
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
    // 1. Find the latest unexpired, unused OTP for this email
    const [otpRecord] = await db.select()
      .from(otps)
      .where(and(
        eq(otps.email, email),
        eq(otps.used, false),
        gt(otps.expiresAt, new Date())
      ))
      .orderBy(desc(otps.createdAt))
      .limit(1);

    if (!otpRecord) {
      throw new Error('Invalid or expired OTP');
    }

    if (otpRecord.attempts >= 5) {
      throw new Error('Too many attempts. Please request a new OTP.');
    }

    // 2. Verify hash
    const isValid = await argon2.verify(otpRecord.codeHash, otp);
    
    if (!isValid) {
      // Increment attempts
      await db.update(otps)
        .set({ attempts: otpRecord.attempts + 1 })
        .where(eq(otps.id, otpRecord.id));
      throw new Error('Invalid OTP');
    }

    // 3. Mark OTP as used
    await db.update(otps)
      .set({ used: true })
      .where(eq(otps.id, otpRecord.id));

    // 4. Find or Create User
    let [user] = await db.select().from(users).where(eq(users.email, email));
    
    if (!user) {
      // Auto-create a new Business for first-time owners
      const [newBusiness] = await db.insert(businesses).values({ 
        name: 'My Hardware Store' 
      }).returning();

      // Create the user as the OWNER of this new business
      const [newUser] = await db.insert(users).values({ 
        email,
        businessId: newBusiness.id,
        role: 'OWNER'
      }).returning();
      
      user = newUser;
    } else if (!user.isActive) {
      throw new Error('User account is deactivated');
    }

    // 5. Generate Access Token (JWT) - 15 minutes
    const accessToken = jwt.sign(
      { sub: user.id, email: user.email, role: user.role, businessId: user.businessId },
      JWT_SECRET,
      { expiresIn: '15m' }
    );

    // 6. Generate Refresh Token - 7 days
    const rawRefreshToken = crypto.randomBytes(64).toString('hex');
    const refreshTokenHash = await argon2.hash(rawRefreshToken);
    const refreshExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await db.insert(sessions).values({
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
        role: user.role,
        businessId: user.businessId
      }
    };
  }

  static async refreshSession(rawRefreshToken: string) {
    // We have to iterate through unrevoked, unexpired sessions? 
    // Since refresh token is random bytes, we can't easily query by hash directly without knowing the user or session ID.
    // Wait, argon2 produces a unique hash every time. We cannot query by hash.
    // Instead, we should pass session ID alongside the refresh token!
    // Let's modify the return to include sessionId, or we can just parse the refresh token as "sessionId:rawToken".
    throw new Error('Not implemented yet');
  }
}
