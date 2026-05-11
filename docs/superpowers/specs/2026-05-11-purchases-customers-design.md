# Purchases + Customers — Enhancement & New Features

## Scope

3 phases covering 10 work items: polish 4 existing pages, build 6 new features.

---

## Phase A — Polish Existing Pages

### A1: PurchasesListPage — add warehouse filter
- Add warehouse dropdown filter (API already supports `warehouseId` param)
- Filter chips show warehouse name

### A2: PurchaseBuilderPage — UX fixes
- Replace `window.prompt()` with proper Cancel dialog (reason textarea + confirm)
- Add unsaved-changes confirmation via `beforeunload` + React Router blocker
- Add file attachment upload section (reuse existing `uploadProductImage` pattern)

### A3: CustomersListPage — add filters + delete + metrics
- Add filter bar: status (active/inactive), credit range, date range
- Add delete action with confirmation dialog
- Add header stat cards: Total Customers, Active, Total Credit Extended, Average Balance

### A4: CustomerEditDrawer — validation + country + toggle
- Email format validation (regex), phone min-length validation
- Country dropdown (20 common countries + "Other")
- Active/inactive toggle switch
- Empty-state CTA button when no customers exist

---

## Phase B — Purchases New Features

### B1: Goods Received

**Backend:**
- `GoodsReceipt` entity: id, ref, purchaseId, supplierId, warehouseId, date, status (DRAFT/POSTED), notes, tenantId, createdAt
- `GoodsReceiptLine` entity: id, receiptId, productId, variantId, orderedQty, receivedQty, unitCost
- `GoodsReceiptController`: `GET/POST /api/v1/goods-receipts`, `POST /{id}/post`
- `GoodsReceiptService`: CRUD + `post()` which increases stock levels via StockService and creates PURCHASE_IN movements
- Migration: `goods_receipts` + `goods_receipt_lines` tables

**Frontend:**
- New page `/smartpos/purchases/goods-received`
- Table: ref, supplier, warehouse, date, status chip
- "Record Receipt" flow: select purchase order → auto-fill lines → adjust received qty → post

### B2: Supplier Returns

**Backend:**
- `SupplierReturn` entity: id, ref, purchaseId (optional), supplierId, warehouseId, date, status (DRAFT/POSTED), reason, notes, tenantId
- `SupplierReturnLine`: productId, variantId, qty, unitCost, reasonCode
- `SupplierReturnController`: `GET/POST /api/v1/supplier-returns`, `POST /{id}/post`
- On post: deducts stock, creates RETURN_OUT stock movements
- Migration: `supplier_returns` + `supplier_return_lines` tables

**Frontend:**
- New page `/smartpos/purchases/supplier-returns`
- Table + create flow with supplier/product picker, reason dropdown (Defective, Wrong Item, Expired, Other), qty field

### B3: Supplier Payments

**Backend:**
- Extend existing payments with supplier payment endpoint
- `POST /api/v1/payments/supplier` — supplierId, amount, method, reference, purchaseId (optional), notes
- `GET /api/v1/payments/supplier?supplierId=&status=` — list
- `GET /api/v1/suppliers/{id}/balance` — outstanding balance (sum of purchase totals - sum of payments)

**Frontend:**
- New page `/smartpos/purchases/supplier-payments`
- Supplier balance summary card
- Payment history table + "Record Payment" dialog (supplier autocomplete, amount, method, reference)
- Link to purchase if payment is for a specific PO

---

## Phase C — Customers New Features

### C1: Customer Groups

**Backend:**
- `CustomerGroup` entity: id, name, description, discountPercent, tenantId, createdAt
- `CustomerGroupController`: full CRUD at `/api/v1/customer-groups`
- Add `groupId` FK to Customer entity (optional)
- Migration: `customer_groups` table + `group_id` column on `customers`

**Frontend:**
- New page `/smartpos/customers/groups`
- Simple table: name, discount %, customer count, edit/delete actions
- Inline create/edit dialog
- CustomerEditDrawer gets group dropdown

### C2: Gift Cards

**Backend:**
- `GiftCard` entity: id, cardNumber, initialBalance, currentBalance, expiryDate, status (ACTIVE/REDEEMED/EXPIRED), customerId (optional), purchasedBy, tenantId
- `GiftCardController`: `GET/POST /api/v1/gift-cards`, `POST /{id}/redeem`
- Migration: `gift_cards` table

**Frontend:**
- New page `/smartpos/customers/gift-cards`
- Table: card number (masked), balance, expiry, status chip
- "Issue Card" dialog: customer (optional), initial amount, expiry date
- "Redeem" dialog: amount, POS reference

### C3: Store Credit

**Backend:**
- `StoreCreditTransaction` entity: id, customerId, amount (signed), type (RETURN_CREDIT/DEPOSIT/REDEMPTION/ADJUSTMENT), reference, notes, tenantId, createdAt
- `StoreCreditController`: `GET /api/v1/store-credit?customerId=`, `POST /api/v1/store-credit`, `POST /api/v1/store-credit/redeem`
- Customer gets computed `storeCredit` balance (sum of transactions)
- Migration: `store_credit_transactions` table

**Frontend:**
- New page `/smartpos/customers/store-credit`
- Global balance summary card
- Transaction table: customer, type, amount, reference, date
- "Add Credit" dialog: customer picker, amount, reason
- "Redeem" dialog: customer picker, amount, POS reference

---

## Sidebar Updates

| Item | Old | New |
|------|-----|-----|
| Goods Received | `...soon` | `/smartpos/purchases/goods-received` |
| Supplier Returns | `...soon` | `/smartpos/purchases/supplier-returns` |
| Supplier Payments | `...soon` | `/smartpos/purchases/supplier-payments` |
| Customer Groups | `...soon` | `/smartpos/customers/groups` |
| Gift Cards | `...soon` | `/smartpos/customers/gift-cards` |
| Store Credit | `...soon` | `/smartpos/customers/store-credit` |

## Route Additions

```ts
// Purchases
{ path: 'purchases/goods-received', element: <SmartPosGoodsReceived /> },
{ path: 'purchases/supplier-returns', element: <SmartPosSupplierReturns /> },
{ path: 'purchases/supplier-payments', element: <SmartPosSupplierPayments /> },
// Customers
{ path: 'customers/groups', element: <SmartPosCustomerGroups /> },
{ path: 'customers/gift-cards', element: <SmartPosGiftCards /> },
{ path: 'customers/store-credit', element: <SmartPosStoreCredit /> },
```

## Gateway Route Updates

Add to inventory-service predicates:
- `/api/v1/goods-receipts/**`, `/api/v1/supplier-returns/**`

Add to payment-service predicates:
- `/api/v1/payments/supplier/**`, `/api/v1/store-credit/**`

Add to product-service predicates:
- `/api/v1/customer-groups/**`, `/api/v1/gift-cards/**`

## Implementation Order

Phase A → Phase B → Phase C (polish first, then new features, then customer tools)
