import { pgTable, uuid, varchar, timestamp, integer, boolean, decimal, text, index, unique, check, pgEnum, jsonb } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

export const businesses = pgTable('businesses', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }).notNull(),
  sector: varchar('sector', { length: 100 }),
  phone: varchar('phone', { length: 50 }),
  location: text('location'),
  isSetupComplete: boolean('is_setup_complete').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull().$onUpdate(() => new Date()),
});

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  businessId: uuid('business_id').notNull().references(() => businesses.id, { onDelete: 'cascade' }),
  email: varchar('email', { length: 255 }).notNull().unique(),
  firstName: varchar('first_name', { length: 100 }),
  lastName: varchar('last_name', { length: 100 }),
  mobileNumber: varchar('mobile_number', { length: 50 }),
  role: varchar('role', { length: 50 }).notNull().default('OWNER'),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull().$onUpdate(() => new Date()),
}, (table) => ({
  businessIdx: index('users_business_idx').on(table.businessId),
  emailIdx: index('users_email_idx').on(table.email)
}));

export const otps = pgTable('otps', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: varchar('email', { length: 255 }).notNull(),
  codeHash: varchar('code_hash', { length: 255 }).notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  attempts: integer('attempts').notNull().default(0),
  used: boolean('used').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  emailIdx: index('otps_email_idx').on(table.email),
  expiresAtIdx: index('otps_expires_at_idx').on(table.expiresAt)
}));

export const sessions = pgTable('sessions', {
  id: uuid('id').primaryKey().defaultRandom(),
  businessId: uuid('business_id').notNull().references(() => businesses.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  refreshTokenHash: varchar('refresh_token_hash', { length: 255 }).notNull().unique(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  revoked: boolean('revoked').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  userIdx: index('sessions_user_idx').on(table.userId),
  businessIdx: index('sessions_business_idx').on(table.businessId),
  expiresAtIdx: index('sessions_expires_at_idx').on(table.expiresAt)
}));

export const categories = pgTable('categories', {
  id: uuid('id').primaryKey().defaultRandom(),
  businessId: uuid('business_id').notNull().references(() => businesses.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 100 }).notNull(), 
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull().$onUpdate(() => new Date()),
}, (table) => ({
  businessIdx: index('categories_business_idx').on(table.businessId),
  uniqueNamePerBusiness: unique('categories_name_business_unique').on(table.businessId, table.name)
}));

export const products = pgTable('products', {
  id: uuid('id').primaryKey().defaultRandom(),
  businessId: uuid('business_id').notNull().references(() => businesses.id, { onDelete: 'cascade' }),
  categoryId: uuid('category_id').notNull().references(() => categories.id, { onDelete: 'restrict' }),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  imageUrl: varchar('image_url', { length: 500 }),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull().$onUpdate(() => new Date()),
  createdBy: uuid('created_by').references(() => users.id),
}, (table) => ({
  businessIdx: index('products_business_idx').on(table.businessId),
  categoryIdx: index('products_category_idx').on(table.categoryId),
  uniqueNamePerBusiness: unique('products_name_business_unique').on(table.businessId, table.name)
}));

export const productVariants = pgTable('product_variants', {
  id: uuid('id').primaryKey().defaultRandom(),
  businessId: uuid('business_id').notNull().references(() => businesses.id, { onDelete: 'cascade' }),
  productId: uuid('product_id').notNull().references(() => products.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }).notNull(),
  sku: varchar('sku', { length: 100 }),
  imageUrl: varchar('image_url', { length: 500 }),
  costPrice: decimal('cost_price', { precision: 12, scale: 2 }).notNull(),
  baseUnitName: varchar('base_unit_name', { length: 50 }).notNull().default('Piece'),
  baseStockQuantity: decimal('base_stock_quantity', { precision: 10, scale: 3 }).notNull().default('0'),
  lowStockThreshold: decimal('low_stock_threshold', { precision: 10, scale: 3 }).notNull().default('0'),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull().$onUpdate(() => new Date()),
}, (table) => ({
  productIdx: index('variants_product_idx').on(table.productId),
  uniqueNamePerProduct: unique('variants_name_product_unique').on(table.productId, table.name),
  costPriceCheck: check('variant_cost_price_check', sql`${table.costPrice} >= 0`),
  stockCheck: check('variant_stock_check', sql`${table.baseStockQuantity} >= 0`)
}));

export const variantUnits = pgTable('variant_units', {
  id: uuid('id').primaryKey().defaultRandom(),
  businessId: uuid('business_id').notNull().references(() => businesses.id, { onDelete: 'cascade' }),
  variantId: uuid('variant_id').notNull().references(() => productVariants.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 100 }).notNull(),
  sellingPrice: decimal('selling_price', { precision: 12, scale: 2 }).notNull(),
  conversionFactor: decimal('conversion_factor', { precision: 10, scale: 4 }).notNull().default('1'),
  isDefault: boolean('is_default').notNull().default(false),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull().$onUpdate(() => new Date()),
}, (table) => ({
  variantIdx: index('units_variant_idx').on(table.variantId),
  uniqueNamePerVariant: unique('units_name_variant_unique').on(table.variantId, table.name),
  sellingPriceCheck: check('units_price_check', sql`${table.sellingPrice} >= 0`),
  conversionFactorCheck: check('units_factor_check', sql`${table.conversionFactor} > 0`)
}));

export const movementTypeEnum = pgEnum('movement_type', ['PURCHASE', 'SALE', 'REFUND', 'DAMAGE', 'ADJUSTMENT']);
export const paymentMethodEnum = pgEnum('payment_method', ['CASH', 'MPESA']);
export const paymentReferenceTypeEnum = pgEnum('payment_reference_type', ['SALE', 'PURCHASE', 'CUSTOMER_DEBT', 'SUPPLIER_DEBT']);
export const paymentStatusEnum = pgEnum('payment_status', ['PAID', 'PARTIAL', 'UNPAID']);
export const auditActionEnum = pgEnum('audit_action', ['CREATE', 'UPDATE', 'DELETE']);

export const suppliers = pgTable('suppliers', {
  id: uuid('id').primaryKey().defaultRandom(),
  businessId: uuid('business_id').notNull().references(() => businesses.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }).notNull(),
  phone: varchar('phone', { length: 20 }),
  email: varchar('email', { length: 255 }),
  balance: decimal('balance', { precision: 12, scale: 2 }).notNull().default('0'),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull().$onUpdate(() => new Date()),
  createdBy: uuid('created_by').references(() => users.id),
}, (table) => ({
  businessIdx: index('suppliers_business_idx').on(table.businessId)
}));

export const purchases = pgTable('purchases', {
  id: uuid('id').primaryKey().defaultRandom(),
  businessId: uuid('business_id').notNull().references(() => businesses.id, { onDelete: 'cascade' }),
  supplierId: uuid('supplier_id').notNull().references(() => suppliers.id, { onDelete: 'restrict' }),
  totalAmount: decimal('total_amount', { precision: 12, scale: 2 }).notNull(),
  amountPaid: decimal('amount_paid', { precision: 12, scale: 2 }).notNull().default('0'),
  paymentStatus: paymentStatusEnum('payment_status').notNull().default('UNPAID'),
  invoiceRef: text('invoice_ref'),
  mpesaRef: varchar('mpesa_ref', { length: 50 }),
  purchasedAt: timestamp('purchased_at', { withTimezone: true }).defaultNow().notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  createdBy: uuid('created_by').references(() => users.id),
}, (table) => ({
  supplierIdx: index('purchases_supplier_idx').on(table.supplierId),
  purchasedAtIdx: index('purchases_purchased_at_idx').on(table.purchasedAt),
  businessIdx: index('purchases_business_idx').on(table.businessId),
  totalAmountCheck: check('purchases_total_amount_check', sql`${table.totalAmount} >= 0`),
  amountPaidCheck: check('purchases_amount_paid_check', sql`${table.amountPaid} >= 0`)
}));

export const purchaseItems = pgTable('purchase_items', {
  id: uuid('id').primaryKey().defaultRandom(),
  businessId: uuid('business_id').notNull().references(() => businesses.id, { onDelete: 'cascade' }),
  purchaseId: uuid('purchase_id').notNull().references(() => purchases.id, { onDelete: 'restrict' }),
  variantId: uuid('variant_id').notNull().references(() => productVariants.id, { onDelete: 'restrict' }),
  unitId: uuid('unit_id').notNull().references(() => variantUnits.id, { onDelete: 'restrict' }),
  quantity: decimal('quantity', { precision: 10, scale: 3 }).notNull(),
  costPrice: decimal('cost_price', { precision: 12, scale: 2 }).notNull(),
  subtotal: decimal('subtotal', { precision: 12, scale: 2 }).notNull(),
}, (table) => ({
  purchaseIdx: index('purchase_items_purchase_idx').on(table.purchaseId),
  variantIdx: index('purchase_items_variant_idx').on(table.variantId),
  unitIdx: index('purchase_items_unit_idx').on(table.unitId),
  businessIdx: index('purchase_items_business_idx').on(table.businessId),
  quantityCheck: check('purchase_items_quantity_check', sql`${table.quantity} > 0`),
  costPriceCheck: check('purchase_items_cost_price_check', sql`${table.costPrice} >= 0`)
}));

export const payments = pgTable('payments', {
  id: uuid('id').primaryKey().defaultRandom(),
  businessId: uuid('business_id').notNull().references(() => businesses.id, { onDelete: 'cascade' }),
  referenceType: paymentReferenceTypeEnum('reference_type').notNull(),
  referenceId: uuid('reference_id').notNull(),
  amount: decimal('amount', { precision: 12, scale: 2 }).notNull(),
  method: paymentMethodEnum('method').notNull(),
  mpesaReceiptNumber: varchar('mpesa_receipt_number', { length: 50 }).unique(),
  paidAt: timestamp('paid_at', { withTimezone: true }).defaultNow().notNull(),
  createdBy: uuid('created_by').references(() => users.id),
}, (table) => ({
  referenceIdx: index('payments_reference_idx').on(table.referenceType, table.referenceId),
  paidAtIdx: index('payments_paid_at_idx').on(table.paidAt),
  businessIdx: index('payments_business_idx').on(table.businessId),
  amountCheck: check('payments_amount_check', sql`${table.amount} > 0`)
}));

export const stockMovements = pgTable('stock_movements', {
  id: uuid('id').primaryKey().defaultRandom(),
  businessId: uuid('business_id').notNull().references(() => businesses.id, { onDelete: 'cascade' }),
  variantId: uuid('variant_id').notNull().references(() => productVariants.id, { onDelete: 'restrict' }),
  type: movementTypeEnum('type').notNull(),
  quantityChange: decimal('quantity_change', { precision: 10, scale: 3 }).notNull(),
  referenceType: varchar('reference_type', { length: 50 }),
  referenceId: uuid('reference_id'),
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  createdBy: uuid('created_by').references(() => users.id),
}, (table) => ({
  variantIdx: index('stock_movements_variant_idx').on(table.variantId),
  typeIdx: index('stock_movements_type_idx').on(table.type),
  createdAtIdx: index('stock_movements_created_at_idx').on(table.createdAt),
  referenceIdx: index('stock_movements_reference_idx').on(table.referenceType, table.referenceId),
  businessIdx: index('stock_movements_business_idx').on(table.businessId)
}));

export const damagedGoods = pgTable('damaged_goods', {
  id: uuid('id').primaryKey().defaultRandom(),
  businessId: uuid('business_id').notNull().references(() => businesses.id, { onDelete: 'cascade' }),
  variantId: uuid('variant_id').notNull().references(() => productVariants.id, { onDelete: 'restrict' }),
  quantity: decimal('quantity', { precision: 10, scale: 3 }).notNull(),
  reason: text('reason'),
  damagedAt: timestamp('damaged_at', { withTimezone: true }).defaultNow().notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  createdBy: uuid('created_by').references(() => users.id),
}, (table) => ({
  variantIdx: index('damaged_goods_variant_idx').on(table.variantId),
  damagedAtIdx: index('damaged_goods_damaged_at_idx').on(table.damagedAt),
  businessIdx: index('damaged_goods_business_idx').on(table.businessId),
  quantityCheck: check('damaged_goods_quantity_check', sql`${table.quantity} > 0`)
}));

export const restockItems = pgTable('restock_items', {
  id: uuid('id').primaryKey().defaultRandom(),
  businessId: uuid('business_id').notNull().references(() => businesses.id, { onDelete: 'cascade' }),
  variantId: uuid('variant_id').notNull().references(() => productVariants.id, { onDelete: 'cascade' }),
  isOrdered: boolean('is_ordered').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  createdBy: uuid('created_by').references(() => users.id),
}, (table) => ({
  businessIdx: index('restock_items_business_idx').on(table.businessId),
  variantIdx: index('restock_items_variant_idx').on(table.variantId),
  uniqueVariantPerBusiness: unique('restock_items_variant_business_unique').on(table.businessId, table.variantId)
}));

export const customers = pgTable('customers', {
  id: uuid('id').primaryKey().defaultRandom(),
  businessId: uuid('business_id').notNull().references(() => businesses.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }).notNull(),
  phone: varchar('phone', { length: 50 }),
  nationalId: varchar('national_id', { length: 50 }),
  address: text('address'),
  notes: text('notes'),
  balance: decimal('balance', { precision: 12, scale: 2 }).notNull().default('0'),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull().$onUpdate(() => new Date()),
  createdBy: uuid('created_by').references(() => users.id),
}, (table) => ({
  businessIdx: index('customers_business_idx').on(table.businessId)
}));

export const sales = pgTable('sales', {
  id: uuid('id').primaryKey().defaultRandom(),
  businessId: uuid('business_id').notNull().references(() => businesses.id, { onDelete: 'cascade' }),
  customerId: uuid('customer_id').references(() => customers.id, { onDelete: 'restrict' }),
  totalAmount: decimal('total_amount', { precision: 12, scale: 2 }).notNull(),
  discountAmount: decimal('discount_amount', { precision: 12, scale: 2 }).notNull().default('0'),
  amountPaid: decimal('amount_paid', { precision: 12, scale: 2 }).notNull().default('0'),
  paymentStatus: paymentStatusEnum('payment_status').notNull().default('UNPAID'),
  paymentMethod: paymentMethodEnum('payment_method').notNull(),
  mpesaRef: varchar('mpesa_ref', { length: 50 }),
  mpesaPhoneNumber: varchar('mpesa_phone_number', { length: 50 }),
  soldAt: timestamp('sold_at', { withTimezone: true }).defaultNow().notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  createdBy: uuid('created_by').references(() => users.id),
}, (table) => ({
  customerIdx: index('sales_customer_idx').on(table.customerId),
  soldAtIdx: index('sales_sold_at_idx').on(table.soldAt),
  businessIdx: index('sales_business_idx').on(table.businessId),
  totalAmountCheck: check('sales_total_amount_check', sql`${table.totalAmount} >= 0`),
  amountPaidCheck: check('sales_amount_paid_check', sql`${table.amountPaid} >= 0`)
}));

export const saleItems = pgTable('sale_items', {
  id: uuid('id').primaryKey().defaultRandom(),
  businessId: uuid('business_id').notNull().references(() => businesses.id, { onDelete: 'cascade' }),
  saleId: uuid('sale_id').notNull().references(() => sales.id, { onDelete: 'restrict' }),
  variantId: uuid('variant_id').notNull().references(() => productVariants.id, { onDelete: 'restrict' }),
  unitId: uuid('unit_id').notNull().references(() => variantUnits.id, { onDelete: 'restrict' }),
  quantity: decimal('quantity', { precision: 10, scale: 3 }).notNull(),
  sellingPrice: decimal('selling_price', { precision: 12, scale: 2 }).notNull(),
  subtotal: decimal('subtotal', { precision: 12, scale: 2 }).notNull(),
}, (table) => ({
  saleIdx: index('sale_items_sale_idx').on(table.saleId),
  variantIdx: index('sale_items_variant_idx').on(table.variantId),
  unitIdx: index('sale_items_unit_idx').on(table.unitId),
  businessIdx: index('sale_items_business_idx').on(table.businessId),
  quantityCheck: check('sale_items_quantity_check', sql`${table.quantity} > 0`),
  sellingPriceCheck: check('sale_items_selling_price_check', sql`${table.sellingPrice} >= 0`)
}));
