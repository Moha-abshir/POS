# API Design

## Base URL

```
Production:  https://api.yourdomain.com/api/v1
Development: http://localhost:3000/api/v1
```

All routes are versioned (`/v1`). If a breaking change is needed in the future, `/v2` routes can coexist.

---

## Standard Response Envelope

Every response — success or error — is wrapped in the same shape.

**Success:**
```json
{
  "success": true,
  "data": { ... },
  "message": "Optional human-readable message"
}
```

**Success (list with pagination):**
```json
{
  "success": true,
  "data": [ ... ],
  "meta": {
    "total": 120,
    "page": 1,
    "limit": 20,
    "totalPages": 6
  }
}
```

**Error:**
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input provided",
    "details": [
      { "field": "email", "message": "Invalid email format" }
    ]
  }
}
```

### Error Codes

| Code | HTTP Status | Meaning |
|---|---|---|
| `VALIDATION_ERROR` | 400 | Request body failed Zod validation |
| `UNAUTHORIZED` | 401 | Missing or invalid access token |
| `FORBIDDEN` | 403 | Token valid but insufficient role |
| `NOT_FOUND` | 404 | Requested resource does not exist |
| `CONFLICT` | 409 | Duplicate resource (e.g., duplicate email) |
| `BUSINESS_RULE_ERROR` | 422 | Valid input but violates business logic (e.g., insufficient stock) |
| `INTERNAL_ERROR` | 500 | Unexpected server error |

---

## Authentication

### `POST /auth/request-otp`
Request a one-time password.
```json
Body: { "email": "owner@store.com" }
Response 200: { "success": true, "message": "OTP sent to email" }
```

### `POST /auth/verify-otp`
Verify OTP and receive tokens.
```json
Body: { "email": "owner@store.com", "otp": "482910" }
Response 200: {
  "success": true,
  "data": {
    "accessToken": "eyJ...",
    "user": { "id": "uuid", "email": "owner@store.com", "role": "OWNER" }
  }
}
Sets-Cookie: refreshToken=...; HttpOnly; Secure; SameSite=Strict
```

### `POST /auth/refresh`
Exchange refresh token cookie for a new access token.
```json
Response 200: { "success": true, "data": { "accessToken": "eyJ..." } }
```

### `POST /auth/logout`
Revoke the current session.
```json
Response 200: { "success": true, "message": "Logged out" }
```

---

## Products & Catalog

> All routes require authentication.

### `GET /products`
```
Query params: page, limit, categoryId, search, isActive
Response: paginated product list
```

### `POST /products`
```json
Body: {
  "categoryId": "uuid",
  "name": "Portland Cement 50kg",
  "description": "...",
  "costPrice": 550.00,
  "lowStockThreshold": 20,
  "units": [
    { "name": "Bag", "sellingPrice": 700.00, "conversionFactor": 1, "isDefault": true }
  ]
}
```

### `GET /products/:id`
Returns full product with units and current stock.

### `PATCH /products/:id`
Partial update of product fields.

### `DELETE /products/:id`
Soft delete — sets `is_active = false`. Blocked if the product has stock movements.

### `GET /products/:id/stock-history`
```
Query params: page, limit, type (movement type filter)
Response: paginated stock_movements for this product
```

### `GET /categories`
### `POST /categories`
### `PATCH /categories/:id`
### `DELETE /categories/:id`

---

## Inventory

### `POST /inventory/adjustments`
Manual stock adjustment (e.g., physical stock count correction).
```json
Body: {
  "productId": "uuid",
  "quantityChange": -5,
  "notes": "Recount after stocktake revealed overcount"
}
```

### `POST /inventory/damages`
Record damaged goods.
```json
Body: {
  "productId": "uuid",
  "quantity": 2,
  "reason": "Cement bags torn in storage",
  "damagedAt": "2025-01-15T10:00:00Z"
}
```

### `GET /inventory/damages`
```
Query params: page, limit, productId, from, to
```

### `GET /inventory/low-stock`
Returns all products where `base_stock_quantity <= low_stock_threshold`.

---

## Suppliers & Purchasing

### `GET /suppliers`
### `POST /suppliers`
```json
Body: { "name": "Bamburi Cement", "phone": "0700000000", "email": "..." }
```
### `GET /suppliers/:id`
Returns supplier with balance and recent purchases.

### `PATCH /suppliers/:id`
### `DELETE /suppliers/:id` (soft delete)

### `GET /suppliers/:id/purchases`

### `POST /purchases`
Create a purchase (triggers stock movement of type PURCHASE).
```json
Body: {
  "supplierId": "uuid",
  "items": [
    { "productId": "uuid", "quantity": 50, "costPrice": 550.00 }
  ],
  "amountPaid": 27500.00,
  "notes": "..."
}
```

### `GET /purchases`
```
Query params: page, limit, supplierId, from, to, paymentStatus
```

### `GET /purchases/:id`

### `POST /purchases/:id/payments`
Record a payment against a purchase (for partial/deferred payments).
```json
Body: { "amount": 5000.00, "method": "CASH" }
```

---

## Customers

### `GET /customers`
```
Query params: page, limit, search, hasBalance (filter by outstanding debt)
```
### `POST /customers`
```json
Body: { "name": "John Kamau", "phone": "0712345678" }
```
### `GET /customers/:id`
Returns customer with credit balance and recent sales.

### `PATCH /customers/:id`
### `GET /customers/:id/sales`
### `GET /customers/:id/statement`
Returns a paginated ledger of sales and payments for this customer.

### `POST /customers/:id/payments`
Record a debt settlement payment.
```json
Body: { "amount": 2000.00, "method": "MPESA", "mpesaReceiptNumber": "QJK..." }
```

---

## Sales (POS)

### `POST /sales`
Create a completed sale. This is the main POS endpoint. Triggers stock movements.
```json
Body: {
  "customerId": "uuid | null",
  "items": [
    { "productUnitId": "uuid", "quantity": 3, "unitPrice": 700.00 }
  ],
  "discountAmount": 0,
  "payments": [
    { "method": "CASH", "amount": 1500.00 },
    { "method": "MPESA", "amount": 600.00, "mpesaReceiptNumber": "QJK..." }
  ]
}
```

### `GET /sales`
```
Query params: page, limit, customerId, from, to, paymentStatus
```

### `GET /sales/:id`
Full sale detail with items and payments.

### `POST /sales/:id/refunds`
Create a refund against a sale (triggers stock movements of type REFUND).
```json
Body: {
  "items": [
    { "productUnitId": "uuid", "quantity": 1 }
  ],
  "reason": "Customer bought wrong size"
}
```

---

## Payments & M-Pesa

### `POST /payments/mpesa/stk-push`
Initiate an STK push to a customer's phone.
```json
Body: {
  "phone": "254712345678",
  "amount": 2100.00,
  "referenceType": "SALE",
  "referenceId": "sale-uuid"
}
Response: { "checkoutRequestId": "ws_CO_..." }
```

### `POST /payments/mpesa/callback`
Safaricom webhook endpoint. Validates origin, processes confirmed payments.
> Not called by the frontend. Called by Safaricom servers only.

### `GET /payments/mpesa/status/:checkoutRequestId`
Manual payment status check (used when callback hasn't arrived).

---

## Reports

All report endpoints support `from` and `to` date range query params.

### `GET /reports/daily`
```
Query: date (defaults to today)
Response: { totalSales, cashTotal, mpesaTotal, transactionCount }
```

### `GET /reports/monthly`
```
Query: year, month
Response: { revenue, costOfGoods, grossProfit, damages }
```

### `GET /reports/inventory`
Returns current stock levels for all products.

### `GET /reports/best-sellers`
```
Query: from, to, limit
Response: products ranked by quantity sold
```

### `GET /reports/customer-balances`
Returns all customers with outstanding credit balances.

### `GET /reports/supplier-balances`
Returns all suppliers with outstanding balances.

### `GET /reports/export/:type`
```
Query: format (pdf | csv | xlsx), from, to
Type: sales | inventory | customers | suppliers
```

---

## Notifications

### `GET /notifications`
Returns unread system notifications (low stock, overdue debts).

### `PATCH /notifications/:id/read`

---

## Data Import/Export

### `POST /import/products`
```
Content-Type: multipart/form-data
Body: CSV file
Response: { imported: 45, failed: 2, errors: [...] }
```

### `POST /import/customers`
### `POST /import/suppliers`
### `GET /export/products` → CSV download
### `GET /export/customers` → CSV download
