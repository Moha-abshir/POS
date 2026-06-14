import { z } from 'zod';

export const createPurchaseSchema = z.object({
  supplierId: z.string().uuid("Invalid supplier ID"),
  items: z.array(z.object({
    variantId: z.string().uuid("Invalid variant ID"),
    unitId: z.string().uuid("Invalid unit ID"),
    quantity: z.number().positive("Quantity must be positive"),
    costPrice: z.number().positive("Cost price must be positive"),
  })).min(1, "At least one item is required"),
  amountPaid: z.number().min(0, "Amount paid cannot be negative"),
  paymentMethod: z.enum(['CASH', 'MPESA']),
  invoiceRef: z.string().optional(),
  mpesaRef: z.string().optional(),
});
