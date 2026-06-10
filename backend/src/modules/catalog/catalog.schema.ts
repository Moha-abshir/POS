import { z } from 'zod';

export const createCategorySchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
});

export const createProductSchema = z.object({
  categoryId: z.string().uuid('Invalid Category ID'),
  name: z.string().min(2, 'Name must be at least 2 characters'),
  description: z.string().optional(),
  imageUrl: z.string().url('Invalid URL').optional(),
  costPrice: z.number().positive('Cost price must be positive'),
  baseStockQuantity: z.number().min(0, 'Initial stock cannot be negative').default(0),
  lowStockThreshold: z.number().min(0).default(5),
});

export const createProductUnitSchema = z.object({
  productId: z.string().uuid('Invalid Product ID'),
  name: z.string().min(1, 'Unit name is required'),
  sellingPrice: z.number().positive('Selling price must be positive'),
  conversionFactor: z.number().positive('Conversion factor must be positive').default(1),
  isDefault: z.boolean().default(false),
});

export type CreateCategoryInput = z.infer<typeof createCategorySchema>;
export type CreateProductInput = z.infer<typeof createProductSchema>;
export type CreateProductUnitInput = z.infer<typeof createProductUnitSchema>;
