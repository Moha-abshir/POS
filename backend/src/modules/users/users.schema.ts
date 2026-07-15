import { z } from 'zod';

export const addUserSchema = z.object({
  email: z.string().email('Invalid email address'),
  firstName: z.string().min(1, 'First name is required').max(100),
  lastName: z.string().min(1, 'Last name is required').max(100),
  mobileNumber: z.string().regex(/^(?:\+254|0)[17]\d{8}$/, 'Invalid mobile number format. Must be a valid Kenyan number (e.g. 07... or +254...).'),
  role: z.enum(['CASHIER', 'MANAGER']).default('CASHIER'),
});

export type AddUserInput = z.infer<typeof addUserSchema>;
