import { z } from 'zod';

export const addUserSchema = z.object({
  email: z.string().email('Invalid email address'),
  firstName: z.string().min(1, 'First name is required').max(100),
  lastName: z.string().min(1, 'Last name is required').max(100),
  mobileNumber: z.string().regex(/^\+?[0-9\s\-()]{7,20}$/, 'Invalid mobile number format.'),
});

export type AddUserInput = z.infer<typeof addUserSchema>;
