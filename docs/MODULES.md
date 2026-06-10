# Module Design

This document defines the boundaries between backend modules, what each module owns, and the rules for inter-module communication.

---

## The Rule

**Modules do not import from each other's internals.**

If Module A needs something from Module B, it either:
1. Calls a public service method exported from Module B's `index.ts`
2. Receives the data it needs as a function parameter

No module directly reaches into another module's repository or controller.

---

## Module Map

### `auth`
**Owns:** `users`, `otps`, `sessions`

**Responsibilities:**
- OTP generation and verification
- JWT issuance and refresh
- Session creation and revocation
- Rate limiting on OTP requests

**Public interface:**
- `verifyToken(token)` → user payload (used by `authenticate` middleware)
- `getUserById(id)` → user (used by audit logging)

**Does not know about:** products, sales, suppliers, or any business domain.

---

### `catalog`
**Owns:** `categories`, `products`, `product_units`

**Responsibilities:**
- CRUD for categories, products, and product units
- Validating product unit rules (one default per product, unique unit names)
- Soft-deleting products

**Public interface:**
- `getProductWithUnits(productId)` → used by `sales` and `purchasing` to validate items
- `getUnitById(unitId)` → used by `sales` to look up price and conversion factor

**Does not know about:** inventory levels, sales, purchases, or payments.

---

### `inventory`
**Owns:** `stock_movements`, `damaged_goods`

**Responsibilities:**
- Recording every stock change as a movement
- Keeping `products.base_stock_quantity` in sync (transactional update)
- Manual adjustment logging
- Damaged goods recording
- Low stock detection

**Public interface:**
- `recordMovement(productId, type, quantityChange, referenceType, referenceId, userId)` → the central function called by `sales`, `purchasing`, and `returns` modules
- `getCurrentStock(productId)` → returns cached stock
- `getLowStockProducts()` → for notifications

**Critical rule:** No module updates `products.base_stock_quantity` directly. All stock changes go through `inventory.recordMovement()`.

---

### `sales`
**Owns:** `sales`, `sale_items`

**Responsibilities:**
- Processing POS transactions (creating sales atomically)
- Managing payment status on sales
- Checking stock availability before confirming a sale

**Dependencies:** calls `catalog.getUnitById()`, calls `inventory.recordMovement()`, calls `payments.createPayments()`

**Does not own:** payment records, refunds, or customer balance — it delegates these.

---

### `purchasing`
**Owns:** `purchases`, `purchase_items`

**Responsibilities:**
- Recording stock intake from suppliers
- Tracking payment status on purchases
- Updating supplier balances

**Dependencies:** calls `inventory.recordMovement()`, calls `payments.createPayments()`

---

### `crm`
**Owns:** `customers`

**Responsibilities:**
- Customer CRUD
- Customer credit balance tracking
- Customer statements (joining sales and payments)

**Dependencies:** reads from `sales` (read-only) to build statements

---

### `payments`
**Owns:** `payments`

**Responsibilities:**
- Recording all payment transactions (cash and M-Pesa)
- STK push initiation and callback handling
- Payment status verification
- Updating balances on the parent entity (sale, purchase, customer, supplier) after payment

**Public interface:**
- `createPayments(referenceType, referenceId, payments[], userId)` → called by `sales` and `purchasing`
- `initiateStKPush(phone, amount, reference)` → called by the frontend indirectly via the payments endpoint

**Critical rule:** M-Pesa logic (Safaricom API calls, signature validation) is isolated within `modules/payments/mpesa/`. Nothing outside this folder ever imports from it.

---

### `reports`
**Owns:** nothing (read-only aggregation module)

**Responsibilities:**
- Running aggregate queries across multiple tables
- Generating PDF, CSV, and Excel exports

**Dependencies:** reads (never writes) from `sales`, `inventory`, `purchasing`, `crm`, `payments`

---

### `audit`
**Owns:** `audit_logs`

**Responsibilities:**
- Providing a `createAuditLog()` function that all other services call after mutations
- Never modifying or deleting audit records

**Public interface:**
- `log({ userId, action, entityType, entityId, oldValues, newValues })` → called everywhere

---

## Transaction Boundaries

Some operations must span multiple modules. These are orchestrated at the service layer of the initiating module using a shared database transaction object.

### Sale creation (example of a multi-module transaction)

```
sales.service.createSale(dto, userId):
  BEGIN TRANSACTION
    1. validate stock availability (calls inventory.getCurrentStock)
    2. insert sale record
    3. insert sale_items
    4. insert stock_movements (calls inventory.recordMovement within same tx)
    5. update products.base_stock_quantity (within same tx)
    6. insert payment records (calls payments.createPayments within same tx)
    7. update sale.payment_status and sale.amount_paid
    8. if customer provided: update customer.credit_balance
  COMMIT
  
  THEN (outside transaction, best-effort):
    9. create audit log entry
```

If any step fails, the entire transaction rolls back. The customer never ends up with reduced stock and no sale record.
