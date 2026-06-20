import { eq, and, isNull, ne } from 'drizzle-orm';
import { db } from '../../db';
import { businessMpesaAccounts } from '../../db/schema';
import { encrypt } from '../../core/utils/crypto.util';

export class MpesaService {
  static async getAccounts(businessId: string) {
    const accounts = await db.query.businessMpesaAccounts.findMany({
      where: and(
        eq(businessMpesaAccounts.businessId, businessId),
        isNull(businessMpesaAccounts.deletedAt)
      ),
      orderBy: (accounts, { asc }) => [asc(accounts.displayOrder), asc(accounts.createdAt)],
    });

    // Mask sensitive fields
    return accounts.map(acc => ({
      ...acc,
      consumerKey: acc.consumerKey ? '••••••••' + acc.consumerKey.slice(-4) : '',
      consumerSecret: '••••••••',
      passkey: '••••••••',
    }));
  }

  static async createAccount(businessId: string, userId: string, data: any) {
    // If this is set as default, we must unset other defaults first
    if (data.isDefault) {
      await db.update(businessMpesaAccounts)
        .set({ isDefault: false })
        .where(eq(businessMpesaAccounts.businessId, businessId));
    }

    const [account] = await db.insert(businessMpesaAccounts).values({
      businessId,
      accountName: data.accountName,
      accountType: data.accountType,
      shortcode: data.shortcode,
      consumerKey: encrypt(data.consumerKey),
      consumerSecret: encrypt(data.consumerSecret),
      passkey: encrypt(data.passkey),
      environment: data.environment,
      accountReferenceTemplate: data.accountReferenceTemplate || null,
      isDefault: data.isDefault,
      isActive: data.isActive,
      createdBy: userId,
      updatedBy: userId,
    }).returning();

    return account;
  }

  static async updateAccount(businessId: string, accountId: string, userId: string, data: any) {
    if (data.isDefault) {
      await db.update(businessMpesaAccounts)
        .set({ isDefault: false })
        .where(and(
          eq(businessMpesaAccounts.businessId, businessId),
          ne(businessMpesaAccounts.id, accountId)
        ));
    }

    const updateData: any = {
      ...data,
      updatedBy: userId,
      updatedAt: new Date(),
    };

    // Only encrypt if they are providing new values (not masked placeholders)
    if (data.consumerKey && !data.consumerKey.includes('••••')) updateData.consumerKey = encrypt(data.consumerKey);
    else delete updateData.consumerKey;

    if (data.consumerSecret && !data.consumerSecret.includes('••••')) updateData.consumerSecret = encrypt(data.consumerSecret);
    else delete updateData.consumerSecret;

    if (data.passkey && !data.passkey.includes('••••')) updateData.passkey = encrypt(data.passkey);
    else delete updateData.passkey;

    const [account] = await db.update(businessMpesaAccounts)
      .set(updateData)
      .where(and(
        eq(businessMpesaAccounts.id, accountId),
        eq(businessMpesaAccounts.businessId, businessId)
      ))
      .returning();

    return account;
  }

  static async deleteAccount(businessId: string, accountId: string, userId: string) {
    const [account] = await db.update(businessMpesaAccounts)
      .set({ 
        deletedAt: new Date(), 
        isDefault: false, // Ensure a deleted account is not the default
        updatedBy: userId 
      })
      .where(and(
        eq(businessMpesaAccounts.id, accountId),
        eq(businessMpesaAccounts.businessId, businessId)
      ))
      .returning();

    return account;
  }

  static async setDefaultAccount(businessId: string, accountId: string, userId: string) {
    await db.update(businessMpesaAccounts)
      .set({ isDefault: false })
      .where(eq(businessMpesaAccounts.businessId, businessId));

    const [account] = await db.update(businessMpesaAccounts)
      .set({ isDefault: true, updatedBy: userId })
      .where(and(
        eq(businessMpesaAccounts.id, accountId),
        eq(businessMpesaAccounts.businessId, businessId)
      ))
      .returning();
      
    return account;
  }

  static async revealCredentials(businessId: string, accountId: string) {
    const account = await db.query.businessMpesaAccounts.findFirst({
      where: and(
        eq(businessMpesaAccounts.id, accountId),
        eq(businessMpesaAccounts.businessId, businessId)
      )
    });

    if (!account) return null;

    return {
      consumerKey: decrypt(account.consumerKey),
      consumerSecret: decrypt(account.consumerSecret),
      passkey: decrypt(account.passkey)
    };
  }
}
