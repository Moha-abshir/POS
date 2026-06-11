import { z } from 'zod';

export const addUserSchema = z.object({
  email: z.string().email('Invalid email address'),
  firstName: z.string().min(1, 'First name is required').max(100),
  lastName: z.string().min(1, 'Last name is required').max(100),
  mobileNumber: z.string().min(1, 'Mobile number is required').max(50),
});

export type AddUserInput = z.infer<typeof addUserSchema>;
