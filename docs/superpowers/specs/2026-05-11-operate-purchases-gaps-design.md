# Operate & Purchases — Missing Features Design

**Date:** 2026-05-11
**Status:** Approved

## Overview

Four features marked "soon" in the sidebar menu need implementation to complete the Operate and Purchases sections.

Current menu state from `SmartPosMenuItems.ts`:

```
Operate:
  POS Terminal          ✅
  Sales                 ✅
  Quotations            ✅
  Returns               ✅
  Suspended Sales       ❌ soon
  Recurring Invoices    ✅

Purchases:
  Purchases             ✅
  Goods Received        ❌ soon
  Supplier Returns      ❌ soon
  Supplier Payments     ❌ soon
```

## Architecture

All backend work lives in the existing microservices. Frontend pages follow established component patterns.

### Backend

| Feature | Service | Type | Files |
|---------|---------|------|-------|
| Suspended Sales | sales-service | NEW | SuspendedSaleController, SuspendedSaleService, SuspendedSale entity, SuspendedSaleRepository, SuspendedSaleDto |
| Goods Received | sales-service | EXTEND | New endpoints on PurchaseController, new columns on PurchaseLine |
| Supplier Returns | sales-service | EXTEND | New list/search endpoints on PurchaseReturnController |
| Supplier Payments | payment-service | NEW | SupplierPaymentController, SupplierPaymentService, SupplierPaymentDto (projection) |

### Frontend

| Feature | Route | Page File |
|---------|-------|-----------|
| Suspended Sales | `/smartpos/sales/suspended` | `views/smartpos/sales/SuspendedSalesPage.tsx` |
| Goods Received | `/smartpos/purchases/received` | `views/smartpos/purchases/GoodsReceivedPage.tsx` |
| Supplier Returns | `/smartpos/purchases/returns` | `views/smartpos/purchases/SupplierReturnsPage.tsx` |
| Supplier Payments | `/smartpos/supplier-payments` | `views/smartpos/money/SupplierPaymentsPage.tsx` |

## Data Models

### SuspendedSale (new table `suspended_sales`)

| Column | Type | Notes |
|--------|------|-------|
| id | UUID | PK |
| tenant_id | UUID | NOT NULL, indexed |
| ref | VARCHAR | e.g. HOLD-000042 |
| terminal_id | UUID | FK to pos_terminals |
| user_id | UUID | Cashier who suspended |
| customer_id | UUID | Nullable |
| warehouse_id | UUID | Nullable |
| lines | JSONB | Cart line items (productId, variantId, name, qty, unitPrice, taxRate, lineTotal) |
| discount_type | VARCHAR | PERCENTAGE / FIXED |
| discount_value | DECIMAL | |
| tax_method | VARCHAR | INCLUSIVE / EXCLUSIVE |
| notes | VARCHAR | |
| status | VARCHAR | OPEN / RESUMED / EXPIRED |
| expires_at | TIMESTAMP | created_at + 7 days |
| created_at | TIMESTAMP | |
| updated_at | TIMESTAMP | |

### PurchaseLine (extend existing `purchase_lines`)

| New Column | Type | Notes |
|------------|------|-------|
| received_qty | DECIMAL | DEFAULT 0 |
| received_at | TIMESTAMP | Nullable, set on last receive |

### SupplierPayment (projection, no new table)

A composite query across payments + purchases + suppliers:

| Field | Source |
|-------|--------|
| paymentId | payments.id |
| supplierId / supplierName | payments + suppliers |
| purchaseRef / purchaseId | payments.reference_id → purchases |
| amount | payments.amount |
| method | payments.method |
| reference | payments.reference |
| date | payments.date |
| accountId / accountName | payments.account_id → accounts |

## API Endpoints

### Suspended Sales — `/api/v1/suspended-sales`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/` | pos.checkout | Suspend current cart |
| GET | `/?page&size&sort&search` | sales.view | Paginated list |
| GET | `/{id}` | sales.view | Single detail with lines |
| POST | `/{id}/resume` | pos.checkout | Resume into POS cart, sets RESUMED |
| DELETE | `/{id}` | sales.manage | Discard a hold |
| DELETE | `/expired` | sales.manage | Purge all expired |

### Goods Received — extend `/api/v1/purchases`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/receiving?page&size&supplierId&from&to` | purchase.view | List received/partial purchases |
| POST | `/{id}/receive-line` | purchase.manage | Record received qty for a line |

### Supplier Returns — extend `/api/v1/purchase-returns`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/?page&size&status&supplierId&from&to&search` | purchase.view | Paginated list with filters |
| POST | `/{id}/complete` | purchase.manage | Mark return COMPLETED |

### Supplier Payments — `/api/v1/payments/supplier`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/?page&size&supplierId&from&to&method&search` | payment.view | Paginated supplier payment list |
| GET | `/{supplierId}/ledger?from&to` | payment.view | Supplier ledger (debits + credits + balance) |

## Frontend Pages

All pages reuse: PageHeader, DataTable, FilterBar, BulkActionBar (where applicable), DocumentActionsBar (where applicable).

### SuspendedSalesPage

- **Route:** `/smartpos/sales/suspended`
- **Header:** "Suspended Sales" with count badge
- **FilterBar:** search by ref/terminal/customer, date range
- **BulkActionBar:** "Discard selected" for bulk delete
- **DataTable columns:** #, Ref, Terminal, Cashier, Customer, Items, Total, Created, Expires, Actions
- **Row actions:** Resume (POST resume → localStorage bridge → navigate to POS), Discard
- **Row click:** opens detail drawer with full cart contents

### GoodsReceivedPage

- **Route:** `/smartpos/purchases/received`
- **Header:** "Goods Received"
- **FilterBar:** search by PO ref/supplier, supplier dropdown, date range, status
- **DataTable columns:** #, PO Ref, Supplier, Date, Ordered Qty, Received Qty, Remaining, Status
- **Row actions:** Receive items modal (per-line qty input), View PO
- **Row click:** navigates to purchase builder

### SupplierReturnsPage

- **Route:** `/smartpos/purchases/returns`
- **Header:** "Supplier Returns" with pending count badge
- **FilterBar:** search by ref/supplier, supplier dropdown, status, date range
- **DataTable columns:** #, Ref, Supplier, Original PO, Lines, Total, Status, Date, Actions
- **Row actions:** Complete, Cancel, Credit Note (DocumentActionsBar)
- **Row click:** navigates to purchase builder

### SupplierPaymentsPage

- **Route:** `/smartpos/supplier-payments`
- **Header:** "Supplier Payments" with monthly total metric
- **FilterBar:** search by ref/supplier, supplier dropdown, payment method, date range, account
- **DataTable columns:** #, Supplier, Purchase Ref, Amount, Method, Account, Date, Reference
- **Row click:** ledger drawer showing debits (purchases), credits (payments), running balance

## Error Handling & Edge Cases

- **Expired hold resume:** Returns 410 Gone with message "This hold has expired"
- **Partial receive overflow:** receiveQty > (orderedQty - alreadyReceivedQty) → 422
- **Duplicate resume:** Idempotent — returns same cart payload
- **All queries:** Tenant-scoped via `TenantContext.require()`
- **Cache:** SuspendedSale list cached with Redis, evicted on create/resume/delete

## Menu Integration

In `SmartPosMenuItems.ts`, replace `soon` chips:

```typescript
// Operate
{ id: uid(), title: 'Suspended Sales', icon: IconClock, href: '/smartpos/sales/suspended' },
// Purchases
{ id: uid(), title: 'Goods Received', icon: IconPackage, href: '/smartpos/purchases/received' },
{ id: uid(), title: 'Supplier Returns', icon: IconArrowBackUp, href: '/smartpos/purchases/returns' },
// Finance
{ id: uid(), title: 'Supplier Payments', icon: IconCoin, href: '/smartpos/supplier-payments' },
```

## Router Changes

In `Router.tsx`, add routes under the SmartPOS children:

```
// Operate
{ path: 'sales/suspended', element: <SmartPosSuspendedSales /> },
// Purchases
{ path: 'purchases/received', element: <SmartPosGoodsReceived /> },
{ path: 'purchases/returns', element: <SmartPosSupplierReturns /> },
// Finance
{ path: 'supplier-payments', element: <SmartPosSupplierPayments /> },
```

And the corresponding lazy imports at the top of Router.tsx.
```

## Testing

- **Backend:** `@WebMvcTest` for controllers, unit tests for services, `@DataJpaTest` for repositories
- **Frontend:** Each page renders with mock API data, filter/search triggers correct API calls, resume flow sets localStorage key before navigation
