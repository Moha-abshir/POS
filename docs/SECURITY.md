# Security Considerations

---

## Authentication & Session Security

- OTPs are never stored in plaintext — only argon2 hashes.
- After 5 failed OTP attempts, the OTP is invalidated permanently. A new one must be requested.
- JWT access tokens expire in 15 minutes. Short expiry limits the damage window if a token is leaked.
- Refresh tokens are stored in `HttpOnly; Secure; SameSite=Strict` cookies. JavaScript cannot access them (blocks XSS-based theft).
- Refresh tokens are tracked in the `sessions` table. Logout immediately revokes the session — there is no waiting for token expiry.
- The OTP request endpoint is rate-limited: max 3 requests per email per 15 minutes.

---

## Input Validation

- Every API endpoint validates its request body against a Zod schema before the controller runs.
- Drizzle ORM uses parameterized queries internally. Raw SQL is avoided. SQL injection is not possible through the ORM layer.
- All monetary inputs are validated to be non-negative decimals with at most 2 decimal places.
- All UUID parameters are validated with `z.string().uuid()` before being used in queries.

---

## CORS

- Production backend only accepts requests from the Vercel production frontend URL.
- The `ALLOWED_ORIGINS` environment variable controls this. No wildcard origins in production.

---

## M-Pesa Webhook Security

Safaricom's callback endpoint (`POST /payments/mpesa/callback`) is a public URL. Anyone could send fake callback payloads to it.

Mitigations:
1. **IP Whitelisting:** Safaricom publishes the IP ranges their callbacks originate from. The Express app (or Railway proxy) rejects requests from unknown IPs.
2. **Payload validation:** The callback payload is validated against the expected Safaricom schema before any payment is recorded.
3. **Idempotency:** The `mpesa_receipt_number` has a `UNIQUE` constraint. Duplicate callbacks for the same transaction are silently rejected by the database, preventing double-recording.

---

## Data Integrity

- Foreign key constraints are enforced at the database level (not just the application layer).
- `ON DELETE RESTRICT` on critical foreign keys (e.g., `sale_items → sales`, `purchase_items → purchases`) prevents orphaned records.
- Monetary column constraints (`CHECK (amount >= 0)`) prevent negative values at the DB level.
- All multi-step operations (sale creation, purchase recording) are wrapped in database transactions. Partial writes cannot occur.

---

## Environment Variables

- No secrets are hardcoded in the codebase.
- `.env` files are in `.gitignore`. `.env.example` (with placeholder values) is committed instead.
- All environment variables are validated at startup via a Zod schema in `config/env.ts`. The app will refuse to start if a required variable is missing.
- `VITE_` prefixed variables (exposed to the browser) contain no secrets — only the backend API URL.

---

## Audit Trail

- All mutations to business-critical entities are logged in `audit_logs`.
- Audit log records are never modified or deleted.
- The `audit_logs` table has no UPDATE or DELETE permissions granted at the DB level (future hardening step).

---

## Data Retention

- Historical sales, purchases, and payments are never deleted.
- Product and customer deactivation is done via `is_active = false` (soft delete), preserving all historical references.
- 5-year retention is the business requirement. No automated data deletion jobs should ever be written without explicit owner approval.

---

## Dependency Security

- Run `npm audit` before every production deployment.
- Keep dependencies up to date, especially security-sensitive packages (jsonwebtoken, argon2, express).
- Lock file (`package-lock.json`) is committed to ensure reproducible builds.
