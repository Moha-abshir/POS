# Fix M-Pesa STK Push Integration — Two Critical Bugs

After scanning all M-Pesa related files, I found **2 critical bugs** that directly cause both symptoms you described, plus **1 important design fix** to prevent the dirty-read orphaned sales.

## Root Cause Analysis

### Your Symptom 1: "M-Pesa STK Push fails"
### Your Symptom 2: "Sale is created with UNPAID status (dirty read)"

Here's what happens step-by-step when you click "Complete Sale" with STK Push:

```
1. POST /sales → Sale created (UNPAID, stock deducted) ✅ Works
2. createSaleMutation.onSuccess fires → triggers STK Push
   → api.post('/mpesa/checkout/push', ...) 💥 CRASH: `api` is not imported!
   → ReferenceError: api is not defined
```

**The sale is already committed to the database before step 2 even runs.** When step 2 crashes, the error is silently caught by the `catch(e)` block which only shows a toast — but the sale and stock deduction are never rolled back. That's your dirty read.

Even if the import was fixed, a second bug would prevent the callback from ever working:

```
3. Backend sends STK Push to Safaricom with:
   CallBackURL: "${appUrl}/api/mpesa/checkout/webhook" ← 404!
   
   But the actual route is:
   /mpesa/webhook/callback ← correct path
```

So Safaricom's callback would hit a nonexistent endpoint, and the sale would stay UNPAID forever.

---

## Proposed Changes

### 🔴 Bug Fix 1: Missing `api` import in CheckoutModal

#### [MODIFY] [CheckoutModal.tsx](file:///home/moha/Projects/POS/frontend/src/features/sales/components/CheckoutModal.tsx)

The file uses `api.post(...)` and `api.get(...)` directly (lines 75, 138) but never imports `api`. Only `salesApi` is imported from the sales API file. This causes a **`ReferenceError`** at runtime, which is the primary reason the STK push never fires.

**Fix:** Add `import { api } from '../../../lib/api';` to the imports.

---

### 🔴 Bug Fix 2: Wrong callback URL sent to Safaricom

#### [MODIFY] [mpesa-checkout.service.ts](file:///home/moha/Projects/POS/backend/src/modules/mpesa/mpesa-checkout.service.ts)

Line 81 sends this callback URL to Safaricom:
```typescript
CallBackURL: `${appUrl}/api/mpesa/checkout/webhook`
```

But the actual Express route (per [index.ts](file:///home/moha/Projects/POS/backend/src/index.ts) line 62 + [mpesa.routes.ts](file:///home/moha/Projects/POS/backend/src/modules/mpesa/mpesa.routes.ts) line 29) is:
```
/mpesa/webhook/callback
```

The URL has two errors:
1. `/api` prefix — routes are mounted without it
2. `/checkout/webhook` — should be `/webhook/callback`

**Fix:** Change to `CallBackURL: \`${appUrl}/mpesa/webhook/callback\``

---

### 🟡 Design Fix 3: Prevent orphaned UNPAID sales (dirty reads)

#### [MODIFY] [CheckoutModal.tsx](file:///home/moha/Projects/POS/frontend/src/features/sales/components/CheckoutModal.tsx)

Currently, the `createSaleMutation` has **two competing `onSuccess` handlers**:

1. **The mutation-level `onSuccess`** (line 47): fires for ALL sales, shows "Sale completed!", resets state, closes modal
2. **The inline `onSuccess`** in `mutate()` (line 134): fires for STK push, triggers the STK push request

Both fire for STK push sales! This means:
- The modal closes immediately (from handler 1) before the STK push even starts
- The "Sale completed successfully!" toast shows even though payment hasn't been confirmed
- If the STK push API call fails, there's no way to delete the orphaned sale because the modal is already closed

**Fix:** The mutation-level `onSuccess` should only run for non-STK-push sales. For STK push, only the inline handler should execute. We restructure the flow so:
- For **non-STK sales**: success toast + close modal (as before)
- For **STK push sales**: don't show success toast, don't close modal — wait for polling to confirm payment. If the STK push API call fails, immediately call `deleteFailedSale` on the backend and show an error.

---

### 🟡 Design Fix 4: Add `isStkPush` to TypeScript type

#### [MODIFY] [sales.api.ts](file:///home/moha/Projects/POS/frontend/src/features/sales/api/sales.api.ts)

The `createSale` function's parameter type is missing `isStkPush`. While this works at runtime (extra properties pass through), it should be in the type for correctness.

---

## Summary of All Changes

| File | Change | Severity |
|------|--------|----------|
| [CheckoutModal.tsx](file:///home/moha/Projects/POS/frontend/src/features/sales/components/CheckoutModal.tsx) | Add `api` import | 🔴 Critical |
| [mpesa-checkout.service.ts](file:///home/moha/Projects/POS/backend/src/modules/mpesa/mpesa-checkout.service.ts) | Fix callback URL path | 🔴 Critical |
| [CheckoutModal.tsx](file:///home/moha/Projects/POS/frontend/src/features/sales/components/CheckoutModal.tsx) | Restructure onSuccess to prevent dirty reads | 🟡 Important |
| [sales.api.ts](file:///home/moha/Projects/POS/frontend/src/features/sales/api/sales.api.ts) | Add `isStkPush` to TypeScript type | 🟢 Minor |

## Verification Plan

### Manual Verification
1. Start the dev server and test STK push flow end-to-end
2. Verify the STK push prompt appears on the test phone number
3. Verify no orphaned UNPAID sales appear in the sales list
4. Verify that cancelling/failing the STK push properly cleans up the sale
5. Verify non-STK-push M-Pesa and Cash sales still work correctly
