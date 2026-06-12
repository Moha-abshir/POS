import { z } from 'zod';

export const adjustStockSchema = z.object({
  productId: z.string().uuid("Invalid product ID"),
  newQuantity: z.number().int().min(0, "Quantity cannot be negative"),
  notes: z.string().optional(),
});

export const recordDamageSchema = z.object({
  productId: z.string().uuid("Invalid product ID"),
  quantity: z.number().int().positive("Quantity must be positive"),
  reason: z.string().min(1, "Reason is required"),
});
