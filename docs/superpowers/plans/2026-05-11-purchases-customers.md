# Purchases + Customers Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Polish 4 existing pages + build 6 new features across Purchases and Customers sections.

**Architecture:** Phase A fixes existing frontend gaps. Phase B adds Goods Received, Supplier Returns, Supplier Payments (new backend entities + pages). Phase C adds Customer Groups, Gift Cards, Store Credit (new backend entities + pages). Each phase is independent and can be verified in isolation.

**Tech Stack:** Java 21 / Spring Boot 3 / Hibernate / Flyway (backend), React 19 / MUI 6 / React Router 7 (frontend).

---

## Phase A — Polish Existing Pages

### Task A1: Fix PurchaseBuilderPage — cancel dialog + unsaved warning

**Files:** `frontend/src/views/smartpos/purchases/PurchaseBuilderPage.tsx`

- [ ] Replace `window.prompt()` for cancel with a Dialog containing reason TextField, Cancel Purchase / Keep Editing buttons
- [ ] Add `useBlocker` from react-router for unsaved-changes warning on navigation
- [ ] Add file attachment upload section using the existing `uploadProductImage` API

```bash
git add frontend/src/views/smartpos/purchases/PurchaseBuilderPage.tsx
git commit -m "fix(purchases): replace prompt with cancel dialog, add unsaved warning, add attachments"
```

### Task A2: Fix PurchasesListPage — add warehouse filter

**Files:** `frontend/src/views/smartpos/purchases/PurchasesListPage.tsx`

- [ ] Add warehouse dropdown using `listWarehouses` from inventory API
- [ ] Pass `warehouseId` to `listPurchases` API call
- [ ] Show warehouse name in filter chips

```bash
git add frontend/src/views/smartpos/purchases/PurchasesListPage.tsx
git commit -m "feat(purchases): add warehouse filter to purchases list"
```

### Task A3: Fix CustomersListPage — filters, delete, metrics + CustomerEditDrawer validation

**Files:** `frontend/src/views/smartpos/customers/CustomersListPage.tsx`, `CustomerEditDrawer.tsx`

- [ ] CustomersListPage: Add status filter (active/inactive), delete with confirmation, header stat cards (total, active, credit extended, avg balance)
- [ ] CustomerEditDrawer: Email regex validation, phone min-length, country dropdown, active toggle

```bash
git add frontend/src/views/smartpos/customers/CustomersListPage.tsx frontend/src/views/smartpos/customers/CustomerEditDrawer.tsx
git commit -m "feat(customers): add filters, delete, metrics to list; validation, country, toggle to edit"
```

---

## Phase B — Purchases New Features

### Task B1: Goods Received — backend

**Files to create:**
- `backend/inventory-service/src/main/resources/db/migration/V9__goods_receipts.sql`
- `backend/inventory-service/.../domain/model/GoodsReceipt.java`
- `backend/inventory-service/.../domain/model/GoodsReceiptLine.java`
- `backend/inventory-service/.../domain/repository/GoodsReceiptRepository.java`
- `backend/inventory-service/.../domain/repository/GoodsReceiptLineRepository.java`
- `backend/inventory-service/.../api/dto/GoodsReceiptDto.java`
- `backend/inventory-service/.../api/dto/CreateGoodsReceiptRequest.java`
- `backend/inventory-service/.../application/GoodsReceiptService.java`
- `backend/inventory-service/.../api/GoodsReceiptController.java`

**Migration:**
```sql
CREATE TABLE goods_receipts (
    id UUID PRIMARY KEY, ref VARCHAR(50) NOT NULL UNIQUE,
    purchase_id UUID, supplier_id UUID, warehouse_id UUID NOT NULL,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    status VARCHAR(20) NOT NULL DEFAULT 'DRAFT',
    notes TEXT, tenant_id UUID, created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE goods_receipt_lines (
    id UUID PRIMARY KEY, receipt_id UUID NOT NULL REFERENCES goods_receipts(id) ON DELETE CASCADE,
    product_id UUID NOT NULL, variant_id UUID,
    ordered_qty NUMERIC(12,3) NOT NULL DEFAULT 0,
    received_qty NUMERIC(12,3) NOT NULL DEFAULT 0, unit_cost NUMERIC(19,4)
);
```

- [ ] `GoodsReceiptService`: `list`, `get`, `create`, `post`. Post method increases stock levels via `StockService.upsert()` + `applyDelta()`, creates PURCHASE_IN movements.
- [ ] `GoodsReceiptController` at `/api/v1/goods-receipts`: GET, POST, POST /{id}/post. Secured with `stock.view` / `stock.count`.

### Task B2: Goods Received — frontend

**Files to create/modify:**
- Create: `frontend/src/views/smartpos/purchases/GoodsReceivedPage.tsx`
- Modify: `frontend/src/routes/Router.tsx` (add route + lazy import)
- Modify: `frontend/src/layouts/full/vertical/sidebar/SmartPosMenuItems.ts` (remove soon)
- Modify: `backend/gateway/src/main/resources/application.yml` (add route predicate)

- [ ] New page with DataTable + "Record Receipt" flow: select purchase → auto-fill lines → adjust received qty → post

### Task B3: Supplier Returns — backend

**Files to create:**
- `backend/inventory-service/src/main/resources/db/migration/V10__supplier_returns.sql`
- `SupplierReturn.java`, `SupplierReturnLine.java`, repositories, service, controller, DTOs

- [ ] On post: deducts stock, creates RETURN_OUT stock movements
- [ ] `SupplierReturnController` at `/api/v1/supplier-returns`

### Task B4: Supplier Returns — frontend

**Files:** `SupplierReturnsPage.tsx` at `/smartpos/purchases/supplier-returns` + route + sidebar

### Task B5: Supplier Payments — backend + frontend

**Backend:** No new entity — extend existing payments. Add `POST /api/v1/payments/supplier` and `GET /api/v1/payments/supplier?supplierId=&status=` endpoints. Add `GET /api/v1/suppliers/{id}/balance` to product-service.

**Frontend:** `SupplierPaymentsPage.tsx` at `/smartpos/purchases/supplier-payments` + route + sidebar

---

## Phase C — Customers New Features

### Task C1: Customer Groups — backend

**Files:** migration + entity + CRUD controller at `/api/v1/customer-groups`. Add `groupId` FK to Customer.

### Task C2: Customer Groups — frontend

**Files:** `CustomerGroupsPage.tsx` at `/smartpos/customers/groups` + route + sidebar + group dropdown in CustomerEditDrawer

### Task C3: Gift Cards — backend

**Files:** migration + entity + controller at `/api/v1/gift-cards`. `POST /{id}/redeem` for POS redemption.

### Task C4: Gift Cards — frontend

**Files:** `GiftCardsPage.tsx` at `/smartpos/customers/gift-cards` + route + sidebar. Issue card dialog, redeem dialog.

### Task C5: Store Credit — backend

**Files:** migration + entity + controller at `/api/v1/store-credit`. Customer gets computed `storeCredit` balance.

### Task C6: Store Credit — frontend

**Files:** `StoreCreditPage.tsx` at `/smartpos/customers/store-credit` + route + sidebar. Add credit dialog, redeem dialog.

### Task C7: Gateway + final verification

- [ ] Update gateway predicates for all new endpoints
- [ ] `npx tsc --noEmit` — frontend type check
- [ ] `mvn compile` — backend compile check
