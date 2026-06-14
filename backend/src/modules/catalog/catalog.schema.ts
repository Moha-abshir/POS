import { z } from 'zod';

export const createCategorySchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
});

export const createProductSchema = z.object({
  categoryId: z.string().uuid('Invalid Category ID'),
  name: z.string().min(2, 'Name must be at least 2 characters'),
  description: z.string().optional(),
  variants: z.array(z.object({
    name: z.string().min(1, 'Variant name is required'),
    sku: z.string().optional(),
    imageUrl: z.string().url('Invalid URL').optional(),
    costPrice: z.number().min(0, 'Cost price must be non-negative'),
    baseUnitName: z.string().min(1).default('Piece'),
    initialStock: z.number().min(0, 'Initial stock cannot be negative').default(0),
    lowStockThreshold: z.number().min(0).default(0),
    units: z.array(z.object({
      name: z.string().min(1, 'Unit name is required'),
      sellingPrice: z.number().min(0, 'Selling price must be non-negative'),
      conversionFactor: z.number().positive('Conversion factor must be positive').default(1),
      isDefault: z.boolean().default(false),
    })).min(1, 'At least one unit is required per variant'),
  })).min(1, 'At least one variant is required'),
});

export const createVariantUnitSchema = z.object({
  variantId: z.string().uuid('Invalid Variant ID'),
  name: z.string().min(1, 'Unit name is required'),
  sellingPrice: z.number().min(0, 'Selling price must be non-negative'),
  conversionFactor: z.number().positive('Conversion factor must be positive').default(1),
  isDefault: z.boolean().default(false),
});

export const updateProductSchema = z.object({
  categoryId: z.string().uuid('Invalid Category ID'),
  name: z.string().min(2, 'Name must be at least 2 characters'),
  description: z.string().optional(),
  isActive: z.boolean(),
}).partial();

export const updateVariantSchema = z.object({
  name: z.string().min(1, 'Variant name is required'),
  sku: z.string().optional(),
  imageUrl: z.string().url('Invalid URL').optional(),
  costPrice: z.number().min(0, 'Cost price must be non-negative'),
  baseUnitName: z.string().min(1),
  lowStockThreshold: z.number().min(0),
  isActive: z.boolean(),
}).partial();

export const updateVariantUnitSchema = z.object({
  name: z.string().min(1, 'Unit name is required'),
  sellingPrice: z.number().min(0, 'Selling price must be non-negative'),
  conversionFactor: z.number().positive('Conversion factor must be positive'),
  isDefault: z.boolean(),
  isActive: z.boolean(),
}).partial();

export type CreateCategoryInput = z.infer<typeof createCategorySchema>;
export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;
export type UpdateVariantInput = z.infer<typeof updateVariantSchema>;
export type CreateVariantUnitInput = z.infer<typeof createVariantUnitSchema>;
export type UpdateVariantUnitInput = z.infer<typeof updateVariantUnitSchema>;
