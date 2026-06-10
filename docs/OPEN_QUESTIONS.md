# Open Questions

These are decisions that cannot be finalized by the development team alone. They require input from the business owner before the relevant phase begins. Each question is tagged with the phase it blocks.

---

## Q1 — Unit Conversion & Inventory Tracking
**Blocks:** Phase 3 (Catalog), Phase 4 (Inventory)

**Question:** For products sold in multiple units (e.g., Wire sold in both Rolls and Meters), the proposed design tracks inventory in a single base unit and uses a `conversion_factor` on each product unit.

**Example:**
- Product: Wire
- Base unit: Meter (conversion_factor = 1)
- Roll: conversion_factor = 50 (1 Roll = 50 Meters)

When you sell 2 Rolls, stock decreases by 100 (Meters).

**What you need to decide:**
1. Does this match how you think about your stock? (Do you count Wire in Meters, or in Rolls?)
2. For products that only have one unit (e.g., Cement only sold in Bags), the conversion_factor would just be 1 — this still works but adds a small amount of setup.
3. Are there any products where this model doesn't fit?

---

## Q2 — M-Pesa Integration Type
**Blocks:** Phase 6 (M-Pesa)

**Question:** Will the store use a **Till Number** (Buy Goods) or a **Paybill** for M-Pesa payments?

- **Till Number (Buy Goods):** Customer pays directly to the till. The shop number is the till. Simpler to set up.
- **Paybill:** Customer enters the paybill number and an account number. More flexible for tracking by account.

The STK push API call differs slightly between these two. This needs to be confirmed before building the M-Pesa integration.

---

## Q3 — Walk-In Sales vs. Customer Accounts
**Blocks:** Phase 5 (Sales)

**Question:** When a customer who doesn't have an account buys something for cash, the sale will be recorded without a customer reference. Is this acceptable?

Follow-up: Should the POS prompt the operator to create a customer record for every sale, or only when the sale is on credit?

**Proposed behavior:**
- Cash/M-Pesa sales: customer is optional (walk-in is fine)
- Credit sales: customer is required (you need to know who owes the money)

Is this correct?

---

## Q4 — Discount Handling
**Blocks:** Phase 5 (Sales)

**Question:** How are discounts applied?

Options:
1. A single discount amount on the whole sale (e.g., KES 200 off a KES 2,000 sale)
2. A percentage discount on the whole sale (e.g., 10% off)
3. Per-item discounts (e.g., discount only on the Paint but not the Nails)

The current schema has `discount_amount` on the `sale` table (option 1). Which matches your workflow?

---

## Q5 — Stock on Credit Sales
**Blocks:** Phase 5 (Sales)

**Question:** When a customer buys on credit, does stock decrease immediately (at the time of the sale), or only when they pay?

**Standard retail practice:** Stock decreases immediately because the goods leave the store regardless of whether they've been paid for yet.

Is this correct for your store?

---

## Q6 — Hosting Accounts Setup
**Blocks:** Phase 1 (Foundation)

You will need accounts on:
- **Vercel** (vercel.com) — for deploying the frontend
- **Railway** (railway.app) — for deploying the backend
- **Neon** (neon.tech) — for the PostgreSQL database
- **Resend** (resend.com) — for sending OTP emails
- **Cloudinary** (cloudinary.com) — for product image storage

For now, development will use local configurations and mocked services where possible so we can build without waiting for credentials.

Is it acceptable to proceed with mocked email (console.log the OTP during development) and mock M-Pesa responses until you're ready to set up the live accounts?

---

## How to Respond

For each question, either:
- **Approve the proposed approach** (say "Q1: Approved" or similar)
- **Provide a different answer** with any relevant details
- **Defer** if you're unsure and want to revisit it when we reach that phase

No question needs to be resolved today. Questions are ordered by which phase they block. Q1 through Q3 should be resolved before Phase 3 begins.
