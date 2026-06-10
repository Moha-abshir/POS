# Risks & Recommendations

---

## High Priority

### M-Pesa Callback Delays

**Risk:** Safaricom STK push callbacks are sometimes delayed by 30 seconds to several minutes. The POS operator is left waiting with no confirmation, and the customer is standing at the counter.

**Mitigation:**
1. After initiating an STK push, the frontend polls `GET /payments/mpesa/status/:checkoutRequestId` every 5 seconds for up to 60 seconds.
2. A manual "Check Payment Status" button is available on the payment screen so the operator can force a status query.
3. If the callback never arrives, the sale remains in `PARTIAL` or `UNPAID` status. The operator can record it as manual cash or mark it for resolution.

**Never do:** Mark a sale as paid before receiving confirmed payment. Always wait for the callback or a status query result.

---

### Inventory Drift

**Risk:** Over time, the cached `products.base_stock_quantity` could drift out of sync with the sum of `stock_movements` if a bug writes a movement without updating the cache, or if a direct DB edit is made.

**Mitigation:**
1. All stock changes go through `inventory.recordMovement()` which updates both in a single transaction — enforced as a module rule.
2. Build a `GET /inventory/audit/:productId` diagnostic endpoint that compares the cached quantity against the live sum of movements and flags discrepancies.
3. Run this diagnostic on a scheduled basis and alert if drift is detected.

---

### Legacy Data Migration Quality

**Risk:** The existing POS system may export data in an inconsistent format. Incorrect mapping during import could result in wrong stock levels or customer balances from day one.

**Mitigation:**
1. Build the CSV import tool early (Phase 9, but plan the schema with it in mind from Phase 1).
2. Import into a staging environment first. Owner reviews imported data before it goes live.
3. The import tool produces an error report listing every row that failed validation and why.
4. Keep the original export files as a reference. Never delete them.

---

## Medium Priority

### Reporting Performance Degradation Over Time

**Risk:** After 5 years of data, queries that aggregate across `stock_movements` and `sales` will become slow if not indexed and structured correctly.

**Mitigation:**
1. Indexes on `sold_at`, `created_at`, `product_id`, and `reference_id` are defined from the start (see `DATABASE_SCHEMA.md`).
2. Monthly summary data can be pre-aggregated and cached in a `monthly_summaries` table if query times become unacceptable. This is not needed initially.
3. Neon's query plan analyzer can be used to identify slow queries before they become customer-facing problems.

---

### Neon Cold Starts

**Risk:** Neon serverless databases can take a moment to resume from idle. If the backend makes a DB query immediately after a long idle period, it may timeout.

**Mitigation:**
1. Railway keeps the backend process alive (no cold starts on the backend).
2. Configure Neon connection pooling via the connection string (`?pgbouncer=true`).
3. Set a retry policy on the Drizzle connection (1-2 retries with 500ms backoff).

---

### Single Owner Dependency

**Risk:** The system is designed for one user. If the owner loses access to their email, they cannot log in. There is no password recovery or secondary auth method.

**Mitigation:**
1. Document a manual recovery procedure: a developer can directly insert a valid session record into the database if the owner proves identity through another channel.
2. In a future phase, consider adding a backup email or a hardware token as a secondary auth method.

---

## Low Priority

### Product Image Storage Costs

**Risk:** Cloudinary's free tier has a 25GB storage limit. A hardware store with thousands of products and multiple images per product could approach this.

**Mitigation:**
1. Compress images on upload (Cloudinary transformation at upload time).
2. Limit to one image per product initially.
3. Monitor storage usage monthly. Upgrading to Cloudinary paid is low cost.

---

### Email Deliverability

**Risk:** OTP emails from Resend could end up in spam, especially if the sender domain is not properly configured.

**Mitigation:**
1. Verify the sender domain with Resend (SPF, DKIM, DMARC records).
2. Use a professional domain for `FROM_EMAIL` (e.g., `noreply@storename.co.ke`), not a generic domain.
3. Test email delivery before go-live.
