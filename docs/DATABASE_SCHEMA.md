# Database Schema

All schema is defined via Drizzle ORM. This document captures the design decisions, constraints, and indexes alongside the table definitions so future developers understand *why* the schema is shaped this way — not just what it looks like.

---

## Conventions

- **Primary Keys:** UUID (`gen_random_uuid()`). UUIDs prevent ID enumeration and allow future distributed scenarios.
- **Table Names:** `snake_case`, plural (e.g., `stock_movements`, `sale_items`).
- **Column Names:** `snake_case`.
- **Monetary Values:** `DECIMAL(12, 2)`. Never `FLOAT` — floating point arithmetic causes rounding errors in financial calculations.
- **Quantities:** `DECIMAL(10, 3)`. Supports fractional quantities (e.g., 2.5 kg).
- **Soft Deletes:** Products and Customers use `is_active` rather than hard deletes, preserving referential integrity on historical records.
- **Audit Columns:** All major tables carry `created_at`, `updated_at`. Tables where attribution matters also carry `created_by` (FK to `users.id`).
- **Timestamps:** All stored as `TIMESTAMP WITH TIME ZONE`.

---

## Enums

```sql
CREATE TYPE movement_type AS ENUM ('PURCHASE', 'SALE', 'REFUND', 'DAMAGE', 'ADJUSTMENT');
CREATE TYPE payment_method AS ENUM ('CASH', 'MPESA');
CREATE TYPE payment_reference_type AS ENUM ('SALE', 'PURCHASE', 'CUSTOMER_DEBT', 'SUPPLIER_DEBT');
CREATE TYPE payment_status AS ENUM ('PAID', 'PARTIAL', 'UNPAID');
CREATE TYPE user_role AS ENUM ('OWNER');
CREATE TYPE audit_action AS ENUM ('CREATE', 'UPDATE', 'DELETE');
```

---

## Tables

### `users`
```sql
CREATE TABLE users (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email        VARCHAR(255) NOT NULL UNIQUE,
  role         user_role NOT NULL DEFAULT 'OWNER',
  is_active    BOOLEAN NOT NULL DEFAULT true,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### `otps`
```sql
CREATE TABLE otps (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email        VARCHAR(255) NOT NULL,
  code_hash    VARCHAR(255) NOT NULL,
  expires_at   TIMESTAMPTZ NOT NULL,
  attempts     INT NOT NULL DEFAULT 0,
  used         BOOLEAN NOT NULL DEFAULT false,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),

  INDEX idx_otps_email (email),
  INDEX idx_otps_expires_at (expires_at)
);
```
> `code_hash` stores argon2 hash of the OTP, never plaintext. `attempts` is incremented on each failed verification. At 5 attempts, the OTP is invalidated regardless of expiry.

### `sessions`
```sql
CREATE TABLE sessions (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  refresh_token_hash VARCHAR(255) NOT NULL UNIQUE,
  expires_at        TIMESTAMPTZ NOT NULL,
  revoked           BOOLEAN NOT NULL DEFAULT false,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),

  INDEX idx_sessions_user_id (user_id),
  INDEX idx_sessions_expires_at (expires_at)
);
```

### `categories`
```sql
CREATE TABLE categories (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name         VARCHAR(100) NOT NULL UNIQUE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### `products`
```sql
CREATE TABLE products (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id          UUID NOT NULL REFERENCES categories(id),
  name                 VARCHAR(255) NOT NULL,
  description          TEXT,
  image_url            VARCHAR(500),
  cost_price           DECIMAL(12,2) NOT NULL CHECK (cost_price >= 0),
  base_stock_quantity  DECIMAL(10,3) NOT NULL DEFAULT 0,
  low_stock_threshold  DECIMAL(10,3) NOT NULL DEFAULT 0,
  is_active            BOOLEAN NOT NULL DEFAULT true,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by           UUID REFERENCES users(id),

  INDEX idx_products_category_id (category_id),
  INDEX idx_products_name (name),
  INDEX idx_products_is_active (is_active)
);
```
> `base_stock_quantity` is a cached value. The authoritative stock is the sum of `stock_movements.quantity_change`. These must always be updated together in the same transaction.

### `product_units`
```sql
CREATE TABLE product_units (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id        UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  name              VARCHAR(100) NOT NULL,
  selling_price     DECIMAL(12,2) NOT NULL CHECK (selling_price >= 0),
  conversion_factor DECIMAL(10,4) NOT NULL DEFAULT 1,
  is_default        BOOLEAN NOT NULL DEFAULT false,
  is_active         BOOLEAN NOT NULL DEFAULT true,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (product_id, name),
  INDEX idx_product_units_product_id (product_id)
);
```
> `conversion_factor` defines how many base units this unit equals. Example: if base unit is Meter and 1 Roll = 50 Meters, then `conversion_factor = 50`. A unit where `is_default = true` has `conversion_factor = 1`. Only one unit per product should have `is_default = true` — enforce this at the application layer.

### `suppliers`
```sql
CREATE TABLE suppliers (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name         VARCHAR(255) NOT NULL,
  phone        VARCHAR(20),
  email        VARCHAR(255),
  balance      DECIMAL(12,2) NOT NULL DEFAULT 0,
  is_active    BOOLEAN NOT NULL DEFAULT true,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by   UUID REFERENCES users(id)
);
```
> `balance` is positive when the store owes the supplier money (store debt). Updated transactionally with every purchase payment.

### `purchases`
```sql
CREATE TABLE purchases (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id      UUID NOT NULL REFERENCES suppliers(id),
  total_amount     DECIMAL(12,2) NOT NULL CHECK (total_amount >= 0),
  amount_paid      DECIMAL(12,2) NOT NULL DEFAULT 0 CHECK (amount_paid >= 0),
  payment_status   payment_status NOT NULL DEFAULT 'UNPAID',
  notes            TEXT,
  purchased_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by       UUID REFERENCES users(id),

  INDEX idx_purchases_supplier_id (supplier_id),
  INDEX idx_purchases_purchased_at (purchased_at)
);
```

### `purchase_items`
```sql
CREATE TABLE purchase_items (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_id UUID NOT NULL REFERENCES purchases(id) ON DELETE RESTRICT,
  product_id  UUID NOT NULL REFERENCES products(id),
  quantity    DECIMAL(10,3) NOT NULL CHECK (quantity > 0),
  cost_price  DECIMAL(12,2) NOT NULL CHECK (cost_price >= 0),
  subtotal    DECIMAL(12,2) NOT NULL,

  INDEX idx_purchase_items_purchase_id (purchase_id),
  INDEX idx_purchase_items_product_id (product_id)
);
```
> `cost_price` here is the price at the time of this specific purchase, not the current product cost price. This is intentional — it preserves purchase history accuracy.

### `customers`
```sql
CREATE TABLE customers (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name         VARCHAR(255) NOT NULL,
  phone        VARCHAR(20),
  credit_balance DECIMAL(12,2) NOT NULL DEFAULT 0,
  is_active    BOOLEAN NOT NULL DEFAULT true,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by   UUID REFERENCES users(id),

  INDEX idx_customers_name (name),
  INDEX idx_customers_phone (phone)
);
```
> `credit_balance` is positive when the customer owes money. Updated transactionally with every sale payment.

### `sales`
```sql
CREATE TABLE sales (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id      UUID REFERENCES customers(id),
  total_amount     DECIMAL(12,2) NOT NULL CHECK (total_amount >= 0),
  discount_amount  DECIMAL(12,2) NOT NULL DEFAULT 0 CHECK (discount_amount >= 0),
  amount_paid      DECIMAL(12,2) NOT NULL DEFAULT 0 CHECK (amount_paid >= 0),
  payment_status   payment_status NOT NULL DEFAULT 'UNPAID',
  notes            TEXT,
  sold_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by       UUID REFERENCES users(id),

  INDEX idx_sales_customer_id (customer_id),
  INDEX idx_sales_sold_at (sold_at),
  INDEX idx_sales_payment_status (payment_status)
);
```

### `sale_items`
```sql
CREATE TABLE sale_items (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id          UUID NOT NULL REFERENCES sales(id) ON DELETE RESTRICT,
  product_unit_id  UUID NOT NULL REFERENCES product_units(id),
  quantity         DECIMAL(10,3) NOT NULL CHECK (quantity > 0),
  unit_price       DECIMAL(12,2) NOT NULL CHECK (unit_price >= 0),
  subtotal         DECIMAL(12,2) NOT NULL,

  INDEX idx_sale_items_sale_id (sale_id),
  INDEX idx_sale_items_product_unit_id (product_unit_id)
);
```

### `payments`
```sql
CREATE TABLE payments (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reference_type       payment_reference_type NOT NULL,
  reference_id         UUID NOT NULL,
  amount               DECIMAL(12,2) NOT NULL CHECK (amount > 0),
  method               payment_method NOT NULL,
  mpesa_receipt_number VARCHAR(50) UNIQUE,
  paid_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by           UUID REFERENCES users(id),

  INDEX idx_payments_reference (reference_type, reference_id),
  INDEX idx_payments_paid_at (paid_at)
);
```

### `stock_movements`
```sql
CREATE TABLE stock_movements (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id       UUID NOT NULL REFERENCES products(id),
  type             movement_type NOT NULL,
  quantity_change  DECIMAL(10,3) NOT NULL,
  reference_type   VARCHAR(50),
  reference_id     UUID,
  notes            TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by       UUID REFERENCES users(id),

  INDEX idx_stock_movements_product_id (product_id),
  INDEX idx_stock_movements_type (type),
  INDEX idx_stock_movements_created_at (created_at),
  INDEX idx_stock_movements_reference (reference_type, reference_id)
);
```

### `refunds`
```sql
CREATE TABLE refunds (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id      UUID NOT NULL REFERENCES sales(id),
  total_amount DECIMAL(12,2) NOT NULL CHECK (total_amount >= 0),
  reason       TEXT,
  refunded_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by   UUID REFERENCES users(id),

  INDEX idx_refunds_sale_id (sale_id)
);
```

### `refund_items`
```sql
CREATE TABLE refund_items (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  refund_id        UUID NOT NULL REFERENCES refunds(id) ON DELETE RESTRICT,
  product_unit_id  UUID NOT NULL REFERENCES product_units(id),
  quantity         DECIMAL(10,3) NOT NULL CHECK (quantity > 0),
  unit_price       DECIMAL(12,2) NOT NULL,
  subtotal         DECIMAL(12,2) NOT NULL,

  INDEX idx_refund_items_refund_id (refund_id)
);
```

### `damaged_goods`
```sql
CREATE TABLE damaged_goods (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id  UUID NOT NULL REFERENCES products(id),
  quantity    DECIMAL(10,3) NOT NULL CHECK (quantity > 0),
  reason      TEXT,
  damaged_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by  UUID REFERENCES users(id),

  INDEX idx_damaged_goods_product_id (product_id),
  INDEX idx_damaged_goods_damaged_at (damaged_at)
);
```

### `audit_logs`
```sql
CREATE TABLE audit_logs (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID REFERENCES users(id),
  action       audit_action NOT NULL,
  entity_type  VARCHAR(100) NOT NULL,
  entity_id    UUID NOT NULL,
  old_values   JSONB,
  new_values   JSONB,
  ip_address   VARCHAR(45),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),

  INDEX idx_audit_logs_user_id (user_id),
  INDEX idx_audit_logs_entity (entity_type, entity_id),
  INDEX idx_audit_logs_created_at (created_at)
);
```

---

## Migration Strategy

- All schema changes are managed via Drizzle Kit (`drizzle-kit generate`, `drizzle-kit migrate`).
- Migration files are committed to version control alongside application code.
- Migrations are never modified after they run in production — always write new migrations.
- Destructive operations (column drops, type changes) require a two-phase migration: first add the new structure, migrate data, then drop the old structure in a separate deployment.
- Neon's branching feature is used to test migrations on a copy of production data before applying to production.
