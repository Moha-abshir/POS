# Domain Model

This document describes the business entities, their responsibilities, and how they relate to each other in plain language. Read this before touching the database schema.

---

## Entities

### User
The business owner. There is currently one user with full access to everything. The entity exists to support future role-based access and to attribute every mutation to a person in the audit log.

A user has a role (`OWNER` by default). Authentication is passwordless — they receive an OTP to their email and exchange it for a JWT session.

---

### Product
A physical item sold by the store (e.g., "Portland Cement 50kg", "Gauge 30 Wire").

A product has:
- A base cost price (what the store paid)
- A current stock quantity (derived from stock movements, cached for performance)
- A low stock threshold (triggers a notification when crossed)
- One or more **units** it can be sold in

A product belongs to a **Category**.

A product is never deleted — it is deactivated (`is_active = false`) to preserve historical sale references.

---

### Product Unit
Defines how a product can be sold. A product can have multiple units.

Examples:
- Cement → `Bag` (selling price: KES 700)
- Wire → `Roll` (selling price: KES 2,500), `Meter` (selling price: KES 55)
- Nails → `Kg` (selling price: KES 120), `Box` (selling price: KES 950)

Each unit has a `conversion_factor` relative to the product's base unit. This allows future inventory deduction logic:

> If 1 Roll = 50 Meters, and you sell 2 Rolls, inventory decreases by 100 (base units).

One unit per product is marked `is_default = true`. This is the unit the system uses for stock reporting.

---

### Category
A grouping label for products (e.g., Cement, Roofing, Plumbing, Fasteners).

---

### Stock Movement
The core of the inventory system. Every time stock changes, a record is inserted — never an update to a quantity field.

Movement types:
- `PURCHASE` — stock came in from a supplier
- `SALE` — stock went out to a customer
- `REFUND` — stock came back from a customer return
- `DAMAGE` — stock was written off as damaged
- `ADJUSTMENT` — manual correction by the owner

Each movement stores:
- The product affected
- The quantity change (positive = stock in, negative = stock out)
- A reference to the source record (e.g., the sale ID or purchase ID that caused it)

Current stock = sum of all `quantity_change` for a product. This is also cached on `products.base_stock_quantity` and updated atomically within the same database transaction.

---

### Supplier
A company or individual that supplies products to the store.

A supplier can be paid immediately (on delivery) or on credit (paid later). The system tracks outstanding supplier balances.

---

### Purchase
A stock intake event — the store bought products from a supplier.

A purchase contains multiple **Purchase Items** (each item = a product + quantity + cost price at time of purchase).

A purchase can be:
- Paid in full at time of purchase
- Paid partially (creating a supplier debt)
- Paid later (full debt)

Payments against a purchase are recorded in the shared **Payments** table.

---

### Customer
A person who buys from the store. Customer details are optional on a sale (walk-in sales don't require a customer record).

A customer may have an outstanding credit balance — meaning they owe money for past purchases.

---

### Sale
A POS transaction. A sale contains:
- One or more **Sale Items** (product unit + quantity + price at time of sale)
- One or more **Payments** (cash, M-Pesa, or split)
- An optional customer reference
- A payment status (`PAID`, `PARTIAL`, `UNPAID`)

Sales are immutable after creation. Corrections are handled via **Refunds**, not edits.

---

### Payment
A single payment event. The payments table is polymorphic — it can reference a sale, a purchase, a customer debt settlement, or a supplier debt settlement.

Payment methods: `CASH`, `MPESA`.

For M-Pesa payments, the `mpesa_receipt_number` is stored and must be unique.

---

### Refund
Created when a customer returns goods. A refund references the original sale but does not modify it.

A refund contains **Refund Items** (which product units were returned and in what quantity).

Refunds trigger stock movements of type `REFUND` (stock increases).

Partial refunds are supported — not all items from the original sale need to be returned.

---

### Damaged Goods
A formal record that some stock was damaged and cannot be sold.

This triggers a stock movement of type `DAMAGE` (stock decreases) and is factored into profit/loss calculations.

---

### Audit Log
An append-only log. Every time a significant record is created, updated, or deleted, a log entry is written capturing:
- Who did it (user ID)
- What they did (`CREATE`, `UPDATE`, `DELETE`)
- Which entity was affected (entity type + entity ID)
- The before and after state (stored as JSONB)
- When it happened

Audit logs are never modified or deleted.

---

## Key Relationships Summary

```
Category → Products → Product Units
Products → Stock Movements (ledger)

Supplier → Purchases → Purchase Items → Products
Purchase → Payments

Customer → Sales → Sale Items → Product Units
Sale → Payments
Sale → Refunds → Refund Items

Products → Damaged Goods → Stock Movements

User → Audit Logs (every mutation)
```

---

## Business Rules

1. A sale that reduces stock below zero must be blocked (unless overridden intentionally).
2. An original sale record must never be modified after creation.
3. A refund cannot exceed the quantity originally sold in the referenced sale.
4. Stock movements are always inserted alongside their source transaction in the same database transaction — they are never inserted separately.
5. Deleting a product is not allowed if it has stock movements, sales, or purchase history.
6. The `cost_price` on a product reflects the current cost. The `cost_price` on a purchase item reflects the historical cost at the time of that purchase. These are separate.
7. OTPs expire after 5 minutes. After 5 failed attempts, the OTP is invalidated and a new one must be requested.
