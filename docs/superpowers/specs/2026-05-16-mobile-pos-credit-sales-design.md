# Mobile POS & Credit Sales — Design Spec

## Summary

Two integrated enhancements to the LetisPOS terminal:

1. **Mobile-first POS layout** — Replace 6 discrete layout components with a single
   responsive shell that adapts from phone (swipeable zones) to desktop (side-by-side).
2. **Credit sales ("Pay Later")** — Customers can take goods without paying upfront.
   Sales are recorded immediately as revenue + receivables. Shopkeepers track who
   owes what and collect payments through three flows: walk-in, next-visit, and
   collection runs.

Both enhancements reuse the existing MUI component library, Letis Green brand
tokens, Sale/Payment/Customer entities, and API patterns. No new framework. No
database migrations. Enhancements on top of what's already there.

---

## Architecture

```
PosTerminalPage.tsx (refactored)
  └─ ResponsivePosShell (new — replaces 6 layout components)
       ├─ CustomerChip (enhanced — adds debt badge, credit status)
       ├─ ProductZone (adapted from existing product grid)
       ├─ CartZone (adapted from existing cart)
       ├─ PaymentZone (enhanced — adds Pay Later option)
       └─ DebtorsSheet (new — bottom sheet, accessible from header)

New routes:
  /pos/credit/:customerId  — CreditAccountPage (existing customer + ledger view)
  /pos/collections          — CollectionsRunPage (mobile-optimized debt collection)

Existing API wire-up (no new controllers required):
  POST   /api/v1/pos/sales          — posCheckout (already handles UNPAID status)
  GET    /api/v1/sales?paymentStatus — listSales (filter by UNPAID/PARTIAL)
  POST   /api/v1/payments           — recordPayment (already exists)
  GET    /api/v1/payments           — listPayments (already exists)
  GET    /api/v1/customers/:id      — getCustomer (creditLimit already exists)
  GET    /api/v1/accounts/ledger    — getAccountLedger (for transaction history)
```

No new backend controllers. The existing `Sale.paymentStatus`, `Sale.dueTotal`,
`Sale.paidTotal`, and `Customer.creditLimit` fields provide all the needed data
model support. Customer balance is computed as `SUM(dueTotal)` across all
UNPAID/PARTIAL sales for that customer.

---

## Section 1 — Mobile POS Layout

### Problem

The current POS has 6 layout components (SplitLayout, ModernLayout, ClassicLayout,
CompactLayout, SidebarLayout, ModalLayout) that all receive the same massive props
bag via `PosLayoutProps`. None are optimized for thumb-driven mobile use. The
product grid wastes space on small screens. The cart isn't thumb-accessible.

### Solution: ResponsivePosShell

One component that arranges its children into CSS Grid slots. The grid template
changes at breakpoints — no code forks.

**Slots (semantic zones):**
- `customer-bar` — CustomerChip (always visible, every zone)
- `product-area` — search + category tabs + product grid
- `cart-area` — line items + quantity controls + totals summary
- `action-bar` — payment method selector + tendered input + checkout button
- `toolbar` — hold, suspend, drafts, register status, barcode toggle

**Phone (< 600px):** Single column, zones stacked. Bottom tab bar for quick zone
jumps (Customer · Products · Cart · Pay). Swipe left/right to navigate between
zones. Cart badge with item count on the Products and Pay tabs.

**Tablet (600-960px):** Two columns. Products left, Cart+Payment right. Customer
bar spans full width at top.

**Desktop (> 960px):** Two columns with generous whitespace. Products on the left
(60%), Cart+Payment on the right (40%). Same layout as current SplitLayout but
rendered by the same component.

### Zone Transitions (Mobile)

```
┌────────────────────────────────────────────────────┐
│  [Maria Santos ▼]         Owes $45  🛒 3 items     │ ← customer-bar (always)
├────────────────────────────────────────────────────┤
│                                                    │
│  ████████████████████████████████████████████████  │ ← active zone (swipeable)
│  ████           CUSTOMER + CART            ████   │
│  ████████████████████████████████████████████████  │
│                                                    │
├────────────────────────────────────────────────────┤
│   👤 Customer  │  📦 Products  │  🛒 Cart  │  💳 Pay │ ← bottom tab bar
└────────────────────────────────────────────────────┘
```

### What's Reused

- MUI Box, Stack, Typography, Button, IconButton for all shell elements
- `brand.ts` for all colors (Letis Green primary, slate neutrals, semantic signals)
- Existing `usePosKeyboardShortcuts` hook
- Existing `useOnlineStatus`, `useOfflineSyncQueue` hooks
- All existing cart logic (add, inc, dec, remove, clear, hold, suspend)
- All existing product search, category filter, barcode scan logic

### What's Removed

- 6 layout components deprecated (kept for one release, then deleted)
- `PosLayoutContext` simplified — no longer needs layout selection state
- `localStorage` layout preference key removed

### Offline Behavior

The shell shows a persistent thin banner when offline (already implemented via
`useOnlineStatus`). When offline:
- Product grid works from last-fetched cache
- Barcode scan works (local lookup)
- Cash sales queue via `useOfflineSyncQueue`
- Credit sales: device stores last-known customer credit status. Sales proceed
  with a warning "Credit limit may be stale — sync when online."

---

## Section 2 — CustomerChip (Enhanced)

The CustomerChip is the "customer-led" anchor. It appears in the top bar of every
zone on mobile, and in the cart header on desktop.

### States

| State | Visual | Behavior |
|-------|--------|----------|
| Walk-in selected | Neutral chip, no badge | Fast cash/card flow. No credit option shown. |
| Known, no debt | Green border, customer name | Credit option available if creditLimit > 0 |
| Known, has debt | Amber border, debt badge | "Owes $X" badge. Credit option available if within limit. |
| Known, over limit | Red border, blocked badge | Credit option disabled. Message: "Over credit limit." |

### Interaction

- Tap chip → customer search/select drawer (already exists, enhanced with debt
  summary per customer in the list)
- Long press chip → jump to that customer's CreditAccountPage
- Debt badge tappable → opens DebtorsSheet with that customer pre-selected

### Implementation

Extends the existing customer selector in each layout. The customer list item
gains a small debt indicator. Fetch uses existing `listCustomers()` augmented
with a client-side balance computation from `getCustomerBalance()`.

---

## Section 3 — Credit Sale Workflow

### Checkout: Pay Later Option

When a known customer has available credit (creditLimit - current balance > 0),
the payment zone shows a third option:

```
┌─────────────────────────┐
│  Total: $32.50          │
│                         │
│  ┌───────────────────┐  │
│  │     💵 Cash       │  │
│  └───────────────────┘  │
│  ┌───────────────────┐  │
│  │     💳 Card       │  │
│  └───────────────────┘  │
│  ┌───────────────────┐  │
│  │  📋 Pay Later     │  │  ← Letis Green when available
│  │  New balance $77.50│  │
│  └───────────────────┘  │
│  ┌───────────────────┐  │
│  │  🔀 Split Payment │  │  ← existing SPLIT option
│  └───────────────────┘  │
└─────────────────────────┘
```

Tapping "Pay Later" calls `posCheckout()` with the same `CreateSaleBody`. The
backend already supports this — `paymentStatus` defaults to UNPAID when no
payment is recorded. `dueTotal` = grandTotal, `paidTotal` = 0.

### Split Payment: Partial Pay + Credit

The existing SPLIT payment method is enhanced. Cashier can:
1. Enter partial amount paid now (e.g., $10 cash)
2. The remainder ($22.50) goes to the customer's tab

This creates a sale with `paymentStatus: PARTIAL`, `paidTotal: 10`, `dueTotal: 22.50`.

Implementation: enhance the existing split payment UI to show "Remaining: $X.XX
→ added to tab" when a known customer with credit is selected.

### Receipt

After a credit sale, the receipt shows:
- Items and totals (same as cash sale)
- Amount paid today ($0 for full credit, or partial amount)
- Previous balance
- **New balance** (prominent, amber highlight)

Receipt generation reuses the existing `ReceiptPreviewModal` and `printReceipt()`
with an additional `creditBalance` field in the lookups.

### Credit Sale Confirmation

A brief confirmation replaces the `PaymentSuccessOverlay` for credit sales:
- "Added to Maria's tab" with the new balance
- "Record Payment" button (jumps to payment screen for this customer)
- "New Sale" button (clears cart for next transaction)

---

## Section 4 — Debt Collection Flows

### Flow A: Walk-in Payment (no purchase)

Customer visits the shop just to pay their debt.

1. Cashier taps "Receive Payment" from POS toolbar or debtors list
2. Selects customer → sees outstanding balance
3. Enters amount paid (defaults to full balance)
4. Selects payment method (cash, card, mobile money)
5. Confirms → `recordPayment()` API call → receipt printed → balance updated

The payment screen is a simple form reusing the existing `recordPayment` API
with `referenceType: 'SALE'` and `referenceId` pointing to the oldest unpaid
sale (FIFO allocation).

### Flow B: Next Visit Checkout

Customer returns to buy more while still owing.

1. Cashier selects customer → debt banner appears in cart zone: "Owes $45.00
   from 2 previous sales. [Settle now] [Add to this purchase]"
2. If "Add to this purchase": old debt displayed as a line item in the cart
   (read-only, cannot be removed). New items added normally. Total = old debt +
   new items.
3. Customer pays full or partial amount. Payment is allocated: first to old debt,
   then to new items.

Implementation: when a customer with outstanding debt is selected, the cart
prepends a synthetic "Previous Balance" line. The totals include this amount.

### Flow C: Collection Run

Shopkeeper or agent visits customers to collect payments.

1. From POS, tap "Collections" → `CollectionsRunPage`
2. See list of debtors, sorted by area/route (or last collection date)
3. Tap a debtor → quick-collect screen:
   - Customer name, outstanding balance, last payment date
   - Amount input (big, thumb-friendly)
   - Payment method toggle (cash/mobile money)
   - "Record & Next" button → saves payment, advances to next debtor
4. Works offline: payments queued via existing `useOfflineSyncQueue`

The CollectionsRunPage is a new mobile-optimized view. It reuses:
- `listSales({ paymentStatus: 'UNPAID' })` to find debtors
- `recordPayment()` for each collection
- `useOfflineSyncQueue` for offline support
- `brand.ts` for styling

---

## Section 5 — Debt Reporting

### POS-Level: DebtorsSheet

A bottom sheet accessible from the POS header (debt badge tap or toolbar icon).

- Header: "Outstanding Debt" + total amount in red
- Filter chips: All | Overdue (>30 days) | Current
- Debtor list: name, amount owed, last payment date, overdue/current badge
- Tap debtor → CreditAccountPage
- Pull-to-refresh

Data: `listSales({ paymentStatus: 'UNPAID,PARTIAL' })` grouped by customer,
augmented with `getCustomer()` for name and `getCustomerBalance()` for totals.

### CreditAccountPage

Full financial picture of one customer. Accessible from:
- Long-press customer chip in POS
- Tap debtor in DebtorsSheet
- Customer detail page in CRM

Layout (mobile-first):
1. **Header** — Letis Green gradient. Customer name, credit limit, active status.
2. **Balance cards** — Outstanding (amber) + Available Credit (green). Large numbers.
3. **Aging breakdown** — 4 columns: <30d (green), 30-60d (amber), 60-90d (red), 90+d (grey).
4. **Quick actions** — "Record Payment" (primary green) + "New Sale" (secondary).
5. **Transaction ledger** — Mixed feed of sales (red, +amount = debt increase) and
   payments (green, -amount = debt decrease). Icon per type (receipt icon for sales,
   cash/card/mobile icon for payments). Tappable rows open sale receipt or payment detail.

Data sources:
- Sales: `listSales({ customerId, paymentStatus: 'UNPAID,PARTIAL,PAID' })`
- Payments: `listPayments({ referenceType: 'SALE' })` scoped to customer's sales
- Balance: computed client-side from sale dueTotals and payment amounts
- Aging: derived from `Sale.date`

### Dashboard Widget

A summary card for the main dashboard:
- Total outstanding (red, large number)
- Overdue >30 days (amber)
- Number of debtors
- Collected this month (green)

Reuses existing dashboard widget patterns. Data from `getSaleStats()` grouped
by paymentStatus.

---

## Section 6 — Data Model

### No New Entities

All information is derived from existing tables:

| Data Point | Source |
|-----------|--------|
| Customer balance | `SUM(Sale.dueTotal)` WHERE `customerId` = X AND `paymentStatus` IN (UNPAID, PARTIAL) |
| Available credit | `Customer.creditLimit` - customer balance |
| Debt aging | `Sale.date` bucketed into <30, 30-60, 60-90, 90+ days |
| Payment history | `Payment` WHERE `referenceType` = 'SALE' AND `referenceId` IN (customer's sale IDs) |
| Total outstanding (dashboard) | `SUM(Sale.dueTotal)` WHERE `paymentStatus` IN (UNPAID, PARTIAL) |
| Collected this month | `SUM(Payment.amount)` WHERE `referenceType` = 'SALE' AND `date` IN current month |

### Existing Fields Used

- `Sale.paymentStatus` — UNPAID, PARTIAL, PAID, REFUNDED (already exists)
- `Sale.paidTotal` — amount paid so far (already exists)
- `Sale.dueTotal` — amount still owed (already exists)
- `Customer.creditLimit` — maximum credit allowed (already exists)
- `Payment.referenceType` — 'SALE' (already exists)
- `Payment.referenceId` — sale UUID (already exists)

### Performance Consideration

Customer balance computation runs per-customer on demand. For the DebtorsSheet
(list all debtors), a single `listSales({ paymentStatus: 'UNPAID,PARTIAL' })`
call returns all unpaid sales. The frontend groups by customer and sums dueTotals.
For shops with < 500 active debtors, this is fast enough without a cached
aggregate.

If scaling is needed later, add a `customer_balance` materialized field updated
by sale/payment triggers. Not needed for v1.

---

## Section 7 — Credit Limit & Safety

### Credit Check at Sale Time

Before allowing "Pay Later":
1. Compute customer's current balance (sum of unpaid sale dueTotals)
2. Add current cart total
3. Compare against `customer.creditLimit`
4. If exceeded: block with message "This sale would exceed Maria's credit limit
   ($200). Current balance: $120. This sale: $85. Would be: $205."

### Walk-in Customers

Walk-in customers have `creditLimit: 0` by default. The "Pay Later" option does
not appear for walk-ins. To enable credit, the cashier must create a customer
record with a credit limit.

### Credit Limit Changes

Changing a customer's credit limit is done from the customer edit drawer (existing
`CustomerEditDrawer`). The `creditLimit` field is already present in `CustomerInput`.

---

## Implementation Phases

### Phase 1 — Credit Sales Core (backend already supports this)
- Enhance payment zone with "Pay Later" option
- CustomerChip with debt badge
- Credit sale receipt (new balance line)
- Split payment: partial pay + credit remainder

### Phase 2 — Debt Collection
- Walk-in payment screen
- Next-visit checkout (previous balance as cart line item)
- CollectionsRunPage (mobile collection rounds)

### Phase 3 — Debt Reporting
- DebtorsSheet (POS bottom sheet)
- CreditAccountPage (full customer ledger)
- Dashboard AR widget

### Phase 4 — Mobile Layout
- ResponsivePosShell component
- Bottom tab bar + swipe navigation
- Deprecate old layout components
- Offline credit safety guard

---

## Design Tokens (from existing brand.ts)

All components use the established token system:

| Usage | Token |
|-------|-------|
| Primary actions, Pay Later button | `brand.primary[600]` (#16A34A) |
| Debt badges, overdue indicators | `brand.warning.main` (#F59E0B) |
| Blocked credit, over limit | `brand.error.main` (#EF4444) |
| Payments, available credit | `brand.success.main` (#22C55E) |
| Surfaces, cards | `brandTokens.surface` |
| Background | `brandTokens.background` |
| Text | `brandTokens.text` |
| Muted text | `brandTokens.textMuted` |
| Borders | `brandTokens.border` |

Dark mode: existing `brandTokensDark` overrides apply automatically via the
`CustomizerContext` already wired into `PosTerminalPage`.

---

## What We're NOT Building

- No new backend service or controller
- No database migrations
- No new component library or design system
- No payment plan / installment scheduler (informal tab only)
- No SMS/WhatsApp debt reminders (manual, outside app)
- No replacement of existing layouts (they coexist until Phase 4)
- No changes to the product, inventory, or warehouse services
