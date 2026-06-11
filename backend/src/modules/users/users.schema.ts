import { z } from 'zod';

export const addUserSchema = z.object({
  email: z.string().email('Invalid email address'),
  firstName: z.string().min(1, 'First name is required').max(100),
  lastName: z.string().min(1, 'Last name is required').max(100),
  mobileNumber: z.string().regex(/^\+?[1-9]\d{7,14}$/, 'Invalid mobile number format. Must be E.164 standard (e.g. +1234567890)'),
});

export type AddUserInput = z.infer<typeof addUserSchema>;
