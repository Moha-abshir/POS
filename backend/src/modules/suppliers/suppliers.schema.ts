import { z } from 'zod';

export const createSupplierSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  phone: z.string().optional(),
  email: z.string().email("Invalid email format").optional().or(z.literal('')),
});

export const updateSupplierSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").optional(),
  phone: z.string().optional(),
  email: z.string().email("Invalid email format").optional().or(z.literal('')),
  isActive: z.boolean().optional(),
});
