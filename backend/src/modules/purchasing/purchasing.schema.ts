import { z } from 'zod';

export const createPurchaseSchema = z.object({
  supplierId: z.string().uuid("Invalid supplier ID"),
  items: z.array(z.object({
    productId: z.string().uuid("Invalid product ID"),
    quantity: z.number().int().positive("Quantity must be positive"),
    costPrice: z.number().positive("Cost price must be positive"),
  })).min(1, "At least one item is required"),
  amountPaid: z.number().min(0, "Amount paid cannot be negative"),
  paymentMethod: z.enum(['CASH', 'MPESA']),
  invoiceRef: z.string().optional(),
  mpesaRef: z.string().optional(),
});
