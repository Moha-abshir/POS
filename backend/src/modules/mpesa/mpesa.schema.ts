import { z } from 'zod';

export const createMpesaAccountSchema = z.object({
  accountName: z.string().min(3).max(100),
  accountType: z.enum(['TILL', 'PAYBILL']),
  shortcode: z.string().min(5).max(10),
  consumerKey: z.string().min(1, 'Consumer Key is required'),
  consumerSecret: z.string().min(1, 'Consumer Secret is required'),
  passkey: z.string().min(1, 'Passkey is required'),
  environment: z.enum(['SANDBOX', 'PRODUCTION']),
  accountReferenceTemplate: z.string().max(100).optional().nullable(),
  isDefault: z.boolean().default(false),
  isActive: z.boolean().default(true),
});

export const updateMpesaAccountSchema = createMpesaAccountSchema.partial();
