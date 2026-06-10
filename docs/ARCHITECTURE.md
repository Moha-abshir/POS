# System Architecture

## Overview

A production-ready Point of Sale and Inventory Management System for a single-branch hardware store. Built for long-term maintainability with a clean separation between business domains.

The system handles inventory, sales, purchasing, credit management, M-Pesa payments, and reporting — all backed by an immutable audit trail.

---

## Technology Stack

| Layer | Technology | Justification |
|---|---|---|
| Frontend | React + Vite + TailwindCSS | Fast builds, component model fits POS UI patterns |
| Data Fetching | TanStack Query | Server-state management, caching, background refetches |
| Routing | React Router | Industry standard, code-splitting friendly |
| Backend | Node.js + Express | Familiar stack, lightweight, great ecosystem |
| ORM | Drizzle ORM | Type-safe queries, SQL-first migrations, no magic |
| Database | PostgreSQL (Neon) | ACID compliance critical for financial transactions |
| Frontend Host | Vercel | Zero-config deployments, edge caching |
| Backend Host | Railway | Dockerized deploys, simple env management |
| File Storage | Cloudinary or AWS S3 | Product images |
| Email | Resend | Simple API, reliable delivery for OTPs |

---

## System Layers

```
┌─────────────────────────────────────┐
│           React Frontend             │
│  (Vite + TailwindCSS + TanStack)    │
└──────────────┬──────────────────────┘
               │ HTTPS / REST
┌──────────────▼──────────────────────┐
│         Express Backend              │
│  Auth → Modules → Services → DB     │
└──────────────┬──────────────────────┘
               │ Drizzle ORM
┌──────────────▼──────────────────────┐
│       PostgreSQL (Neon)              │
│  Transactional + Ledger-based        │
└─────────────────────────────────────┘
```

External services (M-Pesa, Resend, Cloudinary) are isolated behind interface abstractions so they can be swapped without touching business logic.

---

## Business Domains

The system is divided into eight distinct domains. Each owns its data and exposes a defined interface to other domains.

| Domain | Responsibility |
|---|---|
| Identity & Access | User authentication, OTP sessions, JWT tokens |
| Product Catalog | Categories, products, product units |
| Inventory & Stock | Ledger-based stock tracking via movements |
| Sales & Customers | POS transactions, customer profiles, credit |
| Purchasing & Suppliers | Purchase orders, supplier debt, stock intake |
| Payments & M-Pesa | Payment processing, STK push, callbacks |
| Returns & Damages | Refunds (non-destructive), damaged goods |
| Auditing | Centralized immutable log of all mutations |

---

## Key Architectural Decisions

**Ledger-based inventory.** Stock is never directly modified. Every change creates a `stock_movements` record. The current stock is a cached derived value updated transactionally. This gives a complete traceable history of every unit that entered or left the store.

**Non-destructive refunds.** Refunds create new records that reverse a sale. The original sale is never modified. This preserves financial history integrity.

**Payments as a polymorphic table.** A single `payments` table handles cash and M-Pesa payments across sales, purchases, and debt settlements using a `reference_type` + `reference_id` pattern. This avoids duplicating payment logic across modules.

**M-Pesa isolation.** The entire M-Pesa integration lives in `modules/payments`. No other module knows about STK push or Safaricom callbacks. If the payment provider changes, only this module changes.

**Single user, role-ready.** There is currently one user (the owner) with full permissions. The schema and JWT claims include a `role` field so additional roles can be introduced without schema changes.

---

## Constraints

- Single branch only (no multi-tenancy required, but IDs are UUID so branching can be added later)
- Always online (no offline sync required)
- Windows desktop primary (browser-based, so platform-agnostic)
- 5-year data retention (no automatic deletion of historical records)
