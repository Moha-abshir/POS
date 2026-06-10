import { z } from 'zod';

export const addUserSchema = z.object({
  email: z.string().email('Invalid email address'),
});

export type AddUserInput = z.infer<typeof addUserSchema>;
