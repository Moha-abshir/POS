# Folder Structure

Both projects follow a **feature/domain-first** organization. Files are grouped by what they do for the business, not by what kind of file they are. This means you can navigate the codebase by thinking about business operations, and adding a new feature only requires creating a new folder — not reorganizing existing ones.

---

## Backend (`/backend`)

```
backend/
├── src/
│   ├── config/
│   │   ├── env.ts              # Validated env vars (Zod schema on process.env)
│   │   ├── database.ts         # Drizzle + Neon connection
│   │   └── constants.ts        # App-wide constants (OTP_EXPIRY_MINUTES, etc.)
│   │
│   ├── core/
│   │   ├── middleware/
│   │   │   ├── authenticate.ts # JWT verification, attaches req.user
│   │   │   ├── authorize.ts    # Role-based access guard
│   │   │   ├── error-handler.ts# Global Express error handler
│   │   │   ├── rate-limiter.ts # express-rate-limit configurations
│   │   │   └── request-logger.ts
│   │   ├── errors/
│   │   │   ├── app-error.ts    # Base AppError class
│   │   │   └── error-codes.ts  # All error code constants
│   │   └── logger.ts           # Pino logger instance
│   │
│   ├── db/
│   │   ├── schema/             # One Drizzle schema file per table
│   │   │   ├── users.ts
│   │   │   ├── products.ts
│   │   │   ├── sales.ts
│   │   │   └── ...
│   │   ├── migrations/         # Drizzle Kit generated migration files
│   │   ├── seeds/              # Dev/test seed data scripts
│   │   └── index.ts            # Exports the db instance
│   │
│   ├── modules/
│   │   ├── auth/
│   │   │   ├── auth.routes.ts
│   │   │   ├── auth.controller.ts
│   │   │   ├── auth.service.ts
│   │   │   ├── auth.repository.ts
│   │   │   └── auth.validation.ts  # Zod schemas for auth endpoints
│   │   │
│   │   ├── catalog/            # Products, Categories, Units
│   │   │   ├── catalog.routes.ts
│   │   │   ├── catalog.controller.ts
│   │   │   ├── catalog.service.ts
│   │   │   ├── catalog.repository.ts
│   │   │   └── catalog.validation.ts
│   │   │
│   │   ├── inventory/          # Stock movements, Damages, Adjustments
│   │   │   ├── inventory.routes.ts
│   │   │   ├── inventory.controller.ts
│   │   │   ├── inventory.service.ts
│   │   │   ├── inventory.repository.ts
│   │   │   └── inventory.validation.ts
│   │   │
│   │   ├── sales/              # POS transactions, Sale items, Refunds
│   │   │   ├── sales.routes.ts
│   │   │   ├── sales.controller.ts
│   │   │   ├── sales.service.ts
│   │   │   ├── sales.repository.ts
│   │   │   └── sales.validation.ts
│   │   │
│   │   ├── purchasing/         # Suppliers, Purchases, Purchase items
│   │   │   ├── purchasing.routes.ts
│   │   │   ├── purchasing.controller.ts
│   │   │   ├── purchasing.service.ts
│   │   │   ├── purchasing.repository.ts
│   │   │   └── purchasing.validation.ts
│   │   │
│   │   ├── crm/                # Customers, Credit management
│   │   │   ├── crm.routes.ts
│   │   │   ├── crm.controller.ts
│   │   │   ├── crm.service.ts
│   │   │   ├── crm.repository.ts
│   │   │   └── crm.validation.ts
│   │   │
│   │   ├── payments/           # M-Pesa STK push, callbacks, payment records
│   │   │   ├── payments.routes.ts
│   │   │   ├── payments.controller.ts
│   │   │   ├── payments.service.ts
│   │   │   ├── payments.repository.ts
│   │   │   ├── payments.validation.ts
│   │   │   └── mpesa/
│   │   │       ├── mpesa.client.ts     # Safaricom API client (isolated)
│   │   │       ├── mpesa.types.ts      # STK push request/response types
│   │   │       └── mpesa.helpers.ts    # Phone number formatting, etc.
│   │   │
│   │   ├── reports/
│   │   │   ├── reports.routes.ts
│   │   │   ├── reports.controller.ts
│   │   │   ├── reports.service.ts      # Aggregation queries
│   │   │   └── reports.validation.ts
│   │   │
│   │   └── audit/
│   │       ├── audit.service.ts        # createAuditLog() utility used by other services
│   │       └── audit.repository.ts
│   │
│   ├── integrations/
│   │   ├── email/
│   │   │   ├── email.interface.ts      # IEmailService interface
│   │   │   ├── resend.provider.ts      # Resend implementation
│   │   │   └── email.templates.ts      # OTP email template
│   │   └── storage/
│   │       ├── storage.interface.ts    # IStorageService interface
│   │       └── cloudinary.provider.ts
│   │
│   ├── shared/
│   │   ├── types/
│   │   │   └── express.d.ts    # Augments Express Request with req.user
│   │   └── utils/
│   │       ├── pagination.ts   # parsePaginationParams(), buildPaginationMeta()
│   │       ├── response.ts     # sendSuccess(), sendError() helpers
│   │       └── crypto.ts       # generateOTP(), hashToken(), verifyToken()
│   │
│   ├── app.ts                  # Express app setup (middleware, routes)
│   └── index.ts                # Server start, port binding
│
├── drizzle.config.ts
├── .env.example
├── package.json
└── tsconfig.json
```

### Why this structure works

**Modules are self-contained.** Every module has its own routes, controller, service, repository, and validation. To understand how sales work, you only need to read `modules/sales/`. To delete the CRM feature entirely, you delete one folder.

**Layers have clear responsibilities.** Controllers handle HTTP (parse req, call service, send res). Services contain business rules. Repositories contain database queries. Nothing crosses these boundaries.

**Integrations are behind interfaces.** If you switch from Resend to SendGrid, you create `sendgrid.provider.ts` implementing `IEmailService` and change one line in the DI setup. Nothing else changes.

**`core/` is for infrastructure, not business.** Middleware, error classes, and the logger are technical concerns shared by everything. They don't belong in any module.

---

## Frontend (`/frontend`)

```
frontend/
├── src/
│   ├── app/
│   │   ├── router.tsx          # React Router route definitions
│   │   ├── providers.tsx       # QueryClientProvider, AuthProvider, etc.
│   │   └── globals.css         # Tailwind base + custom CSS variables
│   │
│   ├── components/             # Generic, reusable UI with no business knowledge
│   │   ├── ui/                 # Primitive components
│   │   │   ├── Button.tsx
│   │   │   ├── Input.tsx
│   │   │   ├── Modal.tsx
│   │   │   ├── Table.tsx
│   │   │   ├── Badge.tsx
│   │   │   └── ...
│   │   └── layout/
│   │       ├── Sidebar.tsx
│   │       ├── TopBar.tsx
│   │       └── PageHeader.tsx
│   │
│   ├── hooks/                  # Generic hooks with no feature dependencies
│   │   ├── useDebounce.ts
│   │   ├── usePagination.ts
│   │   └── useLocalStorage.ts
│   │
│   ├── lib/
│   │   ├── axios.ts            # Axios instance with interceptors (token refresh)
│   │   ├── queryClient.ts      # TanStack Query client configuration
│   │   └── utils/
│   │       ├── format.ts       # formatCurrency(), formatDate(), formatPhone()
│   │       └── validators.ts   # Shared Zod schemas used across features
│   │
│   ├── features/               # All business-domain code lives here
│   │   ├── auth/
│   │   │   ├── api/
│   │   │   │   └── auth.queries.ts     # TanStack Query hooks (useRequestOtp, etc.)
│   │   │   ├── components/
│   │   │   │   ├── EmailForm.tsx
│   │   │   │   └── OtpForm.tsx
│   │   │   ├── stores/
│   │   │   │   └── auth.store.ts       # Auth state (user, accessToken)
│   │   │   └── types.ts
│   │   │
│   │   ├── pos/                        # The point of sale interface
│   │   │   ├── api/
│   │   │   │   └── pos.queries.ts
│   │   │   ├── components/
│   │   │   │   ├── ProductSearch.tsx
│   │   │   │   ├── Cart.tsx
│   │   │   │   ├── CartItem.tsx
│   │   │   │   ├── PaymentModal.tsx
│   │   │   │   ├── MpesaPayment.tsx
│   │   │   │   └── ReceiptModal.tsx
│   │   │   ├── stores/
│   │   │   │   └── cart.store.ts       # Cart state (items, totals, payment split)
│   │   │   └── types.ts
│   │   │
│   │   ├── catalog/
│   │   │   ├── api/
│   │   │   │   └── catalog.queries.ts
│   │   │   ├── components/
│   │   │   │   ├── ProductTable.tsx
│   │   │   │   ├── ProductForm.tsx
│   │   │   │   ├── UnitManager.tsx
│   │   │   │   └── CategoryPicker.tsx
│   │   │   └── types.ts
│   │   │
│   │   ├── inventory/
│   │   │   ├── api/
│   │   │   ├── components/
│   │   │   │   ├── StockMovementLog.tsx
│   │   │   │   ├── DamagesForm.tsx
│   │   │   │   └── LowStockAlert.tsx
│   │   │   └── types.ts
│   │   │
│   │   ├── purchasing/
│   │   │   ├── api/
│   │   │   ├── components/
│   │   │   │   ├── PurchaseForm.tsx
│   │   │   │   ├── SupplierTable.tsx
│   │   │   │   └── SupplierForm.tsx
│   │   │   └── types.ts
│   │   │
│   │   ├── crm/
│   │   │   ├── api/
│   │   │   ├── components/
│   │   │   │   ├── CustomerTable.tsx
│   │   │   │   ├── CustomerForm.tsx
│   │   │   │   └── CustomerStatement.tsx
│   │   │   └── types.ts
│   │   │
│   │   └── reports/
│   │       ├── api/
│   │       ├── components/
│   │       │   ├── DailyReport.tsx
│   │       │   ├── MonthlyReport.tsx
│   │       │   └── ExportButton.tsx
│   │       └── types.ts
│   │
│   ├── pages/                  # Route-level components (thin wrappers only)
│   │   ├── LoginPage.tsx
│   │   ├── DashboardPage.tsx
│   │   ├── PosPage.tsx
│   │   ├── ProductsPage.tsx
│   │   ├── InventoryPage.tsx
│   │   ├── PurchasesPage.tsx
│   │   ├── CustomersPage.tsx
│   │   ├── SuppliersPage.tsx
│   │   └── ReportsPage.tsx
│   │
│   └── types/
│       └── api.ts              # Shared API response types (ApiResponse<T>, etc.)
│
├── index.html
├── vite.config.ts
├── tailwind.config.ts
├── tsconfig.json
└── .env.example
```

### Why this structure works

**Pages are thin.** Pages only compose feature components together. They contain no business logic, no API calls, and no local state beyond what's needed for layout. A page is a stage; features are the actors.

**Features own their API layer.** The `api/` folder inside each feature contains TanStack Query hooks that are specific to that feature. `catalog.queries.ts` knows about products; nothing outside `features/catalog` imports from it directly.

**`components/ui` knows nothing about the business.** A `Button` or `Table` in `components/ui` has no idea what a sale or a product is. It just renders. This makes them trivially reusable and testable.

**State is colocated.** If the POS cart state only matters to the POS feature, it lives in `features/pos/stores/`, not in a global store. Only truly global state (auth, notifications) lives at the app level.
