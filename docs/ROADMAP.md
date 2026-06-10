# Development Roadmap

## Sequencing Principle

Build the foundation that everything else depends on before building features. Data integrity bugs introduced early compound badly — a corrupted sales record from Phase 4 will break Phase 7's reporting. Do it right in order.

---

## Phase 1 — Foundation

**Goal:** Both projects run locally and can talk to each other. Database is connected.

- [ ] Initialize backend (`npm init`, TypeScript, Express, Drizzle, Zod)
- [ ] Initialize frontend (`npm create vite`, React, TailwindCSS, TanStack Query, React Router)
- [ ] Set up Neon database (dev branch)
- [ ] Configure `drizzle.config.ts` and test connection
- [ ] Set up environment variable validation (`config/env.ts` with Zod)
- [ ] Create global error handler middleware
- [ ] Create standardized response helpers (`sendSuccess`, `sendError`)
- [ ] Set up Pino logger
- [ ] Set up CORS middleware
- [ ] Write and run first migration (just the `users` table)
- [ ] Verify end-to-end: frontend → backend → database query → response

**Exit criteria:** `GET /health` returns `200 OK` with DB connection status.

---

## Phase 2 — Authentication

**Goal:** Owner can log in with OTP and receive a working JWT.

- [ ] Create `otps` and `sessions` tables and migration
- [ ] Implement OTP generation (`crypto.randomInt`), hashing (argon2), and storage
- [ ] Integrate Resend for email delivery (with mock fallback for local dev)
- [ ] Implement OTP verification with attempt tracking
- [ ] Implement JWT issuance and refresh token cookie
- [ ] Implement `authenticate` middleware
- [ ] Implement session refresh and logout endpoints
- [ ] Add rate limiting on OTP request endpoint
- [ ] Build frontend: `EmailForm` → `OtpForm` → redirect to dashboard
- [ ] Build auth store (Zustand) and axios interceptor for token refresh

**Exit criteria:** Full login/logout flow works in the browser. Protected routes reject unauthenticated requests.

---

## Phase 3 — Product Catalog

**Goal:** Owner can manage products and categories.

- [ ] Create `categories`, `products`, `product_units` tables and migration
- [ ] Implement catalog service with unit validation logic (one default per product)
- [ ] Implement all catalog API endpoints
- [ ] Build `ProductsPage` with table, search, and pagination
- [ ] Build `ProductForm` (create + edit) with unit manager
- [ ] Build `CategoryPicker` component
- [ ] Implement soft delete with guard (cannot delete if referenced by stock movements)
- [ ] Wire up audit logging for all catalog mutations

**Exit criteria:** Owner can create, edit, and soft-delete products with multiple units.

---

## Phase 4 — Inventory & Purchasing

**Goal:** Stock levels are accurate and traceable. Owner can record purchases from suppliers.

- [ ] Create `stock_movements`, `damaged_goods`, `suppliers`, `purchases`, `purchase_items` tables and migration
- [ ] Implement `inventory.recordMovement()` — the central stock ledger function
- [ ] Implement transactional stock update (movement insert + `base_stock_quantity` update together)
- [ ] Implement `PurchaseForm` (multi-item, supplier selection, partial payment)
- [ ] Implement damages recording
- [ ] Implement manual adjustment
- [ ] Build `InventoryPage` with stock movement log
- [ ] Implement low stock detection and notification records
- [ ] Wire up audit logging

**Exit criteria:** Creating a purchase increases stock. Recording damage decreases stock. Stock history is accurate.

---

## Phase 5 — Sales & POS

**Goal:** Owner can complete a sale, including split payments. Inventory decreases automatically.

- [ ] Create `customers`, `sales`, `sale_items`, `payments` tables and migration
- [ ] Implement `sales.service.createSale()` as a full database transaction
- [ ] Build `PosPage` with `ProductSearch`, `Cart`, `PaymentModal`
- [ ] Implement cash-only payment flow first
- [ ] Implement credit sales (customer owes balance)
- [ ] Build `CustomersPage` with balance display
- [ ] Wire up audit logging

**Exit criteria:** A complete sale reduces stock, records the payment, and updates the customer balance if on credit.

---

## Phase 6 — M-Pesa Integration

**Goal:** Owner can accept M-Pesa payments via STK push. Callbacks are handled securely.

- [ ] Register for Safaricom Daraja API credentials (sandbox first)
- [ ] Implement `mpesa.client.ts` (token fetch, STK push, status query)
- [ ] Implement STK push endpoint
- [ ] Implement callback handler with IP validation and idempotency
- [ ] Implement manual "verify payment" polling fallback
- [ ] Integrate into POS `PaymentModal` (M-Pesa tab)
- [ ] Test full flow in Safaricom sandbox

**Exit criteria:** A payment initiated via STK push is confirmed via callback and recorded against the sale.

---

## Phase 7 — Refunds & Credit Management

**Goal:** Owner can process refunds and manage customer/supplier credit.

- [ ] Create `refunds`, `refund_items` tables and migration
- [ ] Implement refund service (non-destructive, triggers REFUND stock movement)
- [ ] Build `RefundModal` accessible from sale detail view
- [ ] Implement partial refund support
- [ ] Build `CustomerStatement` view (sales + payments ledger)
- [ ] Build supplier balance view
- [ ] Wire up audit logging

**Exit criteria:** A refund increases stock, does not modify the original sale, and reduces the customer balance if applicable.

---

## Phase 8 — Reporting

**Goal:** Owner can view daily summaries, monthly P&L, and export data.

- [ ] Implement `reports.service` with all aggregate queries
- [ ] Build `DailyReport`, `MonthlyReport` components
- [ ] Implement low stock report
- [ ] Implement customer balances and supplier balances reports
- [ ] Implement PDF/CSV/Excel export using a library (e.g., PDFKit, csv-writer, ExcelJS)
- [ ] Build `ReportsPage`

**Exit criteria:** Owner can generate and download a monthly profit report as a PDF.

---

## Phase 9 — Data Import & Polish

**Goal:** Legacy data is migrated. System is ready for production handoff.

- [ ] Build CSV import for products (with validation and error reporting)
- [ ] Build CSV import for customers and suppliers
- [ ] Build CSV export for all major entities
- [ ] Implement in-app notifications (low stock, overdue debts)
- [ ] Full end-to-end testing of all critical paths
- [ ] Security review (run `npm audit`, review CORS, check env vars)
- [ ] Run final migration against production Neon branch
- [ ] Deploy to Vercel + Railway production
- [ ] Run backup restore test

**Exit criteria:** Legacy data is in the system. Owner has signed off on all features. System is live.
