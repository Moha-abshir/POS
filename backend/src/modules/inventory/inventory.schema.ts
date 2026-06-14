import { z } from 'zod';

export const adjustStockSchema = z.object({
  variantId: z.string().uuid("Invalid variant ID"),
  newQuantity: z.number().min(0, "Quantity cannot be negative"),
  notes: z.string().optional(),
});

export const recordDamageSchema = z.object({
  variantId: z.string().uuid("Invalid variant ID"),
  quantity: z.number().positive("Quantity must be positive"),
  reason: z.string().min(1, "Reason is required"),
});
