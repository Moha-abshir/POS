import { pgTable, uuid, varchar, timestamp, integer, boolean, decimal, text, index, uniqueIndex, unique, check, pgEnum, jsonb } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

export const admins = pgTable('admins', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }).notNull(),
  email: varchar('email', { length: 255 }).notNull(),
  passwordHash: varchar('password_hash', { length: 255 }),
  role: varchar('role', { length: 50 }).notNull().default('super_admin'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull().$onUpdate(() => new Date()),
  lastLoginAt: timestamp('last_login_at', { withTimezone: true }),
}, (table) => ({
  emailIdx: index('admins_email_idx').on(table.email),
  uniqueEmailIdx: uniqueIndex('admins_email_lower_idx').on(sql`LOWER(${table.email})`)
}));

export const businesses = pgTable('businesses', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }).notNull(),
  sector: varchar('sector', { length: 100 }),
  phone: varchar('phone', { length: 50 }),
  location: text('location'),
  isSetupComplete: boolean('is_setup_complete').notNull().default(false),
  status: varchar('status', { length: 50 }).notNull().default('pending'),
  approvedAt: timestamp('approved_at', { withTimezone: true }),
  approvedBy: uuid('approved_by').references(() => admins.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull().$onUpdate(() => new Date()),
});

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  businessId: uuid('business_id').notNull().references(() => businesses.id, { onDelete: 'cascade' }),
  email: varchar('email', { length: 255 }).notNull(),
  firstName: varchar('first_name', { length: 100 }),
  lastName: varchar('last_name', { length: 100 }),
  mobileNumber: varchar('mobile_number', { length: 50 }),
  role: varchar('role', { length: 50 }).notNull().default('OWNER'),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull().$onUpdate(() => new Date()),
}, (table) => ({
  businessIdx: index('users_business_idx').on(table.businessId),
  emailIdx: index('users_email_idx').on(table.email),
  uniqueEmailIdx: uniqueIndex('users_email_lower_idx').on(sql`LOWER(${table.email})`)
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
  businessActiveIdx: index('products_business_active_idx').on(table.businessId).where(sql`${table.isActive} = true`),
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
  businessIdx: index('variants_business_idx').on(table.businessId),
  businessActiveIdx: index('variants_business_active_idx').on(table.businessId).where(sql`${table.isActive} = true`),
  uniqueNamePerProduct: unique('variants_name_product_unique').on(table.productId, table.name),
  costPriceCheck: check('variant_cost_price_check', sql`${table.costPrice} >= 0`)
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
  businessIdx: index('units_business_idx').on(table.businessId),
  uniqueNamePerVariant: unique('units_name_variant_unique').on(table.variantId, table.name),
  sellingPriceCheck: check('units_price_check', sql`${table.sellingPrice} >= 0`),
  conversionFactorCheck: check('units_factor_check', sql`${table.conversionFactor} > 0`)
}));

export const movementTypeEnum = pgEnum('movement_type', ['PURCHASE', 'SALE', 'REFUND', 'DAMAGE', 'ADJUSTMENT']);
export const paymentMethodEnum = pgEnum('payment_method', ['CASH', 'MPESA']);
export const paymentReferenceTypeEnum = pgEnum('payment_reference_type', ['SALE', 'PURCHASE', 'CUSTOMER_DEBT', 'SUPPLIER_DEBT']);
export const paymentStatusEnum = pgEnum('payment_status', ['PAID', 'PARTIAL', 'UNPAID']);
export const auditActionEnum = pgEnum('audit_action', ['CREATE', 'UPDATE', 'DELETE']);
export const accountTypeEnum = pgEnum('mpesa_account_type', ['TILL', 'PAYBILL']);
export const mpesaEnvEnum = pgEnum('mpesa_env', ['SANDBOX', 'PRODUCTION']);
export const transactionStatusEnum = pgEnum('transaction_status', ['PENDING', 'COMPLETED', 'FAILED']);
export const extendedPaymentMethodEnum = pgEnum('extended_payment_method', ['CASH', 'MPESA', 'CREDIT', 'SPLIT']);

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
  businessPurchasedAtIdx: index('purchases_business_purchased_at_idx').on(table.businessId, table.purchasedAt),
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
  status: transactionStatusEnum('status').notNull().default('COMPLETED'),
  mpesaReceiptNumber: varchar('mpesa_receipt_number', { length: 50 }).unique(),
  notes: text('notes'),
  paidAt: timestamp('paid_at', { withTimezone: true }).defaultNow().notNull(),
  createdBy: uuid('created_by').references(() => users.id),
}, (table) => ({
  referenceIdx: index('payments_reference_idx').on(table.referenceType, table.referenceId),
  paidAtIdx: index('payments_paid_at_idx').on(table.paidAt),
  businessIdx: index('payments_business_idx').on(table.businessId),
  businessPaidAtIdx: index('payments_business_paid_at_idx').on(table.businessId, table.paidAt),
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
  businessDamagedAtIdx: index('damaged_goods_business_damaged_at_idx').on(table.businessId, table.damagedAt),
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

export const customerTypeEnum = pgEnum('customer_type', ['INDIVIDUAL', 'BUSINESS']);

export const customers = pgTable('customers', {
  id: uuid('id').primaryKey().defaultRandom(),
  businessId: uuid('business_id').notNull().references(() => businesses.id, { onDelete: 'cascade' }),
  type: customerTypeEnum('type').notNull().default('INDIVIDUAL'),
  name: varchar('name', { length: 255 }).notNull(),
  phone: varchar('phone', { length: 50 }),
  nationalId: varchar('national_id', { length: 50 }),
  address: text('address'),
  notes: text('notes'),
  balance: decimal('balance', { precision: 12, scale: 2 }).notNull().default('0'),
  periodOwed: varchar('period_owed', { length: 50 }),
  hasActiveCredit: boolean('has_active_credit').notNull().default(false),
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
  paymentMethod: extendedPaymentMethodEnum('payment_method').notNull(),
  mpesaRef: varchar('mpesa_ref', { length: 50 }),
  mpesaPhoneNumber: varchar('mpesa_phone_number', { length: 50 }),
  soldAt: timestamp('sold_at', { withTimezone: true }).defaultNow().notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  createdBy: uuid('created_by').references(() => users.id),
}, (table) => ({
  customerIdx: index('sales_customer_idx').on(table.customerId),
  soldAtIdx: index('sales_sold_at_idx').on(table.soldAt),
  businessIdx: index('sales_business_idx').on(table.businessId),
  businessSoldAtIdx: index('sales_business_sold_at_idx').on(table.businessId, table.soldAt),
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
  costPrice: decimal('cost_price', { precision: 12, scale: 2 }).notNull().default('0'),
  subtotal: decimal('subtotal', { precision: 12, scale: 2 }).notNull(),
}, (table) => ({
  saleIdx: index('sale_items_sale_idx').on(table.saleId),
  variantIdx: index('sale_items_variant_idx').on(table.variantId),
  unitIdx: index('sale_items_unit_idx').on(table.unitId),
  businessIdx: index('sale_items_business_idx').on(table.businessId),
  quantityCheck: check('sale_items_quantity_check', sql`${table.quantity} > 0`),
  sellingPriceCheck: check('sale_items_selling_price_check', sql`${table.sellingPrice} >= 0`),
  costPriceCheck: check('sale_items_cost_price_check', sql`${table.costPrice} >= 0`)
}));


export const businessMpesaAccounts = pgTable('business_mpesa_accounts', {
  id: uuid('id').primaryKey().defaultRandom(),
  businessId: uuid('business_id').notNull().references(() => businesses.id, { onDelete: 'cascade' }),
  accountName: varchar('account_name', { length: 100 }).notNull(),
  accountType: accountTypeEnum('account_type').notNull(),
  shortcode: varchar('shortcode', { length: 20 }).notNull(),
  consumerKey: text('consumer_key').notNull(),
  consumerSecret: text('consumer_secret').notNull(),
  passkey: text('passkey').notNull(),
  environment: mpesaEnvEnum('environment').notNull().default('SANDBOX'),
  accountReferenceTemplate: varchar('account_reference_template', { length: 100 }),
  isDefault: boolean('is_default').notNull().default(false),
  isActive: boolean('is_active').notNull().default(true),
  displayOrder: integer('display_order').notNull().default(0),
  createdBy: uuid('created_by').references(() => users.id),
  updatedBy: uuid('updated_by').references(() => users.id),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull().$onUpdate(() => new Date()),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
}, (table) => ({
  businessIdx: index('mpesa_acc_bus_idx').on(table.businessId),
  uniqueDefaultPerBusiness: uniqueIndex('unique_default_mpesa_acc').on(table.businessId).where(sql`${table.isDefault} = true AND ${table.deletedAt} IS NULL`)
}));



export const mpesaTransactions = pgTable('mpesa_transactions', {
  id: uuid('id').primaryKey().defaultRandom(),
  paymentId: uuid('payment_id').notNull().references(() => payments.id, { onDelete: 'cascade' }),
  mpesaAccountId: uuid('mpesa_account_id').notNull().references(() => businessMpesaAccounts.id, { onDelete: 'restrict' }),
  checkoutRequestId: varchar('checkout_request_id', { length: 100 }).unique(),
  merchantRequestId: varchar('merchant_request_id', { length: 100 }),
  transactionCode: varchar('transaction_code', { length: 50 }).unique(),
  phoneNumber: varchar('phone_number', { length: 20 }),
  amount: decimal('amount', { precision: 12, scale: 2 }).notNull(),
  status: transactionStatusEnum('status').notNull().default('PENDING'),
  resultCode: integer('result_code'),
  resultDesc: text('result_desc'),
  rawCallbackJson: jsonb('raw_callback_json'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull().$onUpdate(() => new Date()),
}, (table) => ({
  paymentIdx: index('mpesa_trans_payment_idx').on(table.paymentId),
  checkoutIdx: index('mpesa_trans_checkout_idx').on(table.checkoutRequestId),
  mpesaAccountIdx: index('mpesa_trans_account_idx').on(table.mpesaAccountId)
}));

export const refunds = pgTable('refunds', {
  id: uuid('id').primaryKey().defaultRandom(),
  businessId: uuid('business_id').notNull().references(() => businesses.id, { onDelete: 'cascade' }),
  saleId: uuid('sale_id').notNull().references(() => sales.id, { onDelete: 'restrict' }),
  totalAmount: decimal('total_amount', { precision: 12, scale: 2 }).notNull(),
  reason: text('reason'),
  refundedAt: timestamp('refunded_at', { withTimezone: true }).defaultNow().notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  createdBy: uuid('created_by').references(() => users.id),
}, (table) => ({
  businessIdx: index('refunds_business_idx').on(table.businessId),
  saleIdx: index('refunds_sale_idx').on(table.saleId),
  totalAmountCheck: check('refunds_total_amount_check', sql`${table.totalAmount} >= 0`),
}));

export const refundItems = pgTable('refund_items', {
  id: uuid('id').primaryKey().defaultRandom(),
  businessId: uuid('business_id').notNull().references(() => businesses.id, { onDelete: 'cascade' }),
  refundId: uuid('refund_id').notNull().references(() => refunds.id, { onDelete: 'restrict' }),
  variantId: uuid('variant_id').notNull().references(() => productVariants.id, { onDelete: 'restrict' }),
  unitId: uuid('unit_id').notNull().references(() => variantUnits.id, { onDelete: 'restrict' }),
  quantity: decimal('quantity', { precision: 10, scale: 3 }).notNull(),
  unitPrice: decimal('unit_price', { precision: 12, scale: 2 }).notNull(),
  subtotal: decimal('subtotal', { precision: 12, scale: 2 }).notNull(),
}, (table) => ({
  businessIdx: index('refund_items_business_idx').on(table.businessId),
  refundIdx: index('refund_items_refund_idx').on(table.refundId),
  variantIdx: index('refund_items_variant_idx').on(table.variantId),
  unitIdx: index('refund_items_unit_idx').on(table.unitId),
  quantityCheck: check('refund_items_quantity_check', sql`${table.quantity} > 0`),
  unitPriceCheck: check('refund_items_unit_price_check', sql`${table.unitPrice} >= 0`),
  subtotalCheck: check('refund_items_subtotal_check', sql`${table.subtotal} >= 0`),
}));

export const expenses = pgTable('expenses', {
  id: uuid('id').primaryKey().defaultRandom(),
  businessId: uuid('business_id').notNull().references(() => businesses.id, { onDelete: 'cascade' }),
  category: varchar('category', { length: 100 }).notNull(),
  description: text('description'),
  amount: decimal('amount', { precision: 12, scale: 2 }).notNull(),
  expenseDate: timestamp('expense_date', { withTimezone: true }).defaultNow().notNull(),
  createdBy: uuid('created_by').references(() => users.id),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull().$onUpdate(() => new Date()),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
}, (table) => ({
  businessIdx: index('expenses_business_idx').on(table.businessId),
  expenseDateIdx: index('expenses_date_idx').on(table.expenseDate),
  amountCheck: check('expenses_amount_check', sql`${table.amount} > 0`)
}));

export const cashDrawerSessions = pgTable('cash_drawer_sessions', {
  id: uuid('id').primaryKey().defaultRandom(),
  businessId: uuid('business_id').notNull().references(() => businesses.id, { onDelete: 'cascade' }),
  openedById: uuid('opened_by_id').notNull().references(() => users.id, { onDelete: 'restrict' }),
  closedById: uuid('closed_by_id').references(() => users.id, { onDelete: 'restrict' }),
  status: varchar('status', { length: 20 }).notNull().default('OPEN'),
  openingFloat: decimal('opening_float', { precision: 12, scale: 2 }).notNull().default('0'),
  expectedCash: decimal('expected_cash', { precision: 12, scale: 2 }).notNull().default('0'),
  actualCash: decimal('actual_cash', { precision: 12, scale: 2 }).notNull().default('0'),
  difference: decimal('difference', { precision: 12, scale: 2 }).notNull().default('0'),
  denominationCounts: jsonb('denomination_counts'),
  notes: text('notes'),
  resolutionStatus: varchar('resolution_status', { length: 20 }).notNull().default('UNRESOLVED'),
  resolutionType: varchar('resolution_type', { length: 30 }),
  resolvedAt: timestamp('resolved_at', { withTimezone: true }),
  resolvedById: uuid('resolved_by_id').references(() => users.id),
  resolutionNotes: text('resolution_notes'),
  resolutionReferenceId: uuid('resolution_reference_id'),
  openedAt: timestamp('opened_at', { withTimezone: true }).defaultNow().notNull(),
  closedAt: timestamp('closed_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull().$onUpdate(() => new Date()),
}, (table) => ({
  businessIdx: index('cash_drawer_sessions_business_idx').on(table.businessId),
  openedByIdx: index('cash_drawer_sessions_opened_by_idx').on(table.openedById),
  closedByIdx: index('cash_drawer_sessions_closed_by_idx').on(table.closedById),
  resolvedByIdx: index('cash_drawer_sessions_resolved_by_idx').on(table.resolvedById),
  statusIdx: index('cash_drawer_sessions_status_idx').on(table.status),
}));

export const notifications = pgTable('notifications', {
  id: uuid('id').primaryKey().defaultRandom(),
  businessId: uuid('business_id').notNull().references(() => businesses.id, { onDelete: 'cascade' }),
  type: varchar('type', { length: 50 }).notNull(), // 'LOW_STOCK', 'DAMAGE', 'CASH_DISCREPANCY', 'SYSTEM'
  title: varchar('title', { length: 255 }).notNull(),
  message: text('message').notNull(),
  isRead: boolean('is_read').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  businessIdx: index('notifications_business_idx').on(table.businessId),
  isReadIdx: index('notifications_is_read_idx').on(table.isRead),
}));


