# Inventory Menu — Missing Features Implementation

## Scope

Implement the 4 "soon"-marked features in the Inventory sidebar section:

1. **Reorder Rules** — automatic reorder points and quantities
2. **Batch / Lot Tracking** — track inventory by batch/lot numbers
3. **Expiry Tracking** — expiry date tracking on batches, alerts
4. **Damage & Waste** — two-step damage/waste recording with supervisor approval

---

## 1. Reorder Rules

### Backend

**Entity: `ReorderRule`**
- id, tenantId, productId, variantId (optional), warehouseId
- minQty (reorder point — when stock ≤ this, reorder)
- reorderQty (how much to order)
- supplierId (optional — for auto-filling POs)
- active, createdAt, updatedAt

**API (`ReorderRuleController`):**
- `GET /api/v1/reorder-rules?warehouseId=&productId=&active=` — paginated list
- `GET /api/v1/reorder-rules/{id}` — single
- `POST /api/v1/reorder-rules` — create
- `PUT /api/v1/reorder-rules/{id}` — update
- `DELETE /api/v1/reorder-rules/{id}` — delete
- `GET /api/v1/reorder-rules/triggered?warehouseId=` — returns rules where current stock ≤ minQty (for dashboard use)

**Service: `ReorderRuleService`** — CRUD + triggered query.

**Migration:** `V6__reorder_rules.sql` — reorder_rules table.

### Frontend

**New page: `ReorderRulesPage`**
- Route: `/smartpos/stock/reorder-rules`
- Table layout: product name, warehouse, current stock, minQty, reorderQty, supplier, status badge (OK / Low Stock)
- Inline add/edit via drawer or dialog
- Warehouse filter dropdown
- "Create Purchase Order" bulk action — selects all triggered rules, navigates to purchase builder with items pre-filled

**Dashboard integration:**
- Alert card in dashboard side rail: "N products below reorder point" → links to reorder rules page

**Files created/changed:**
- Backend: entity, repository, service, controller, DTOs, migration
- Frontend: `ReorderRulesPage.tsx`, API layer, route, sidebar update

---

## 2. Batch / Lot Tracking

### Backend

**Entity: `ProductBatch`**
- id, tenantId, batchNumber (free-text, e.g. "LOT-2026-05-001")
- productId, variantId (optional), warehouseId
- manufacturingDate (optional)
- expiryDate (optional — used by Expiry Tracking)
- onHand, reserved (tracked per batch, same semantics as StockLevel)
- status: `ACTIVE` | `EXPIRED` | `DEPLETED`
- createdAt, updatedAt

**API (`ProductBatchController`):**
- `GET /api/v1/batches?productId=&warehouseId=&status=&expiringBefore=&expiringAfter=&search=` — paginated, search by batchNumber
- `GET /api/v1/batches/{id}` — single with stock details
- `POST /api/v1/batches` — create (used when receiving goods with batch numbers)
- `PUT /api/v1/batches/{id}` — update metadata
- `GET /api/v1/batches/{id}/movements` — stock movements for this batch

**Integration with StockLevel:**
- StockLevel remains the aggregate (onHand = sum of all batch onHand for that product/warehouse)
- When receiving goods: `POST /api/v1/batches` creates batch + updates StockLevel
- When selling: FIFO deduction from oldest batch's onHand, then updates StockLevel
- StockMovement records reference batchId

**Service: `ProductBatchService`** — CRUD + stock operations.

**Migration:** `V7__product_batches.sql` — product_batches table + batchId on stock_movements.

### Frontend

**Integrated into Stock Levels page:**
- Stock Levels table gets an expandable row (accordion style) — expanding a product row shows batch breakdown
- Batch columns: batch number, expiry date (chip: green = >90d, yellow = 30-90d, red = <30d), on hand, reserved, status
- Quick action: "Receive Batch" button → dialog with batch number, mfg date, expiry date, quantity fields
- Filter chips: "Has Batches", "Expiring Soon", batch number search

**New page NOT created** — all batch UI lives within Stock Levels.

**Files changed:**
- Backend: entity, repository, service, controller, DTOs, migration, StockLevelService (batch-aware deduction)
- Frontend: enhanced StockLevelsPage, batch API layer, types

---

## 3. Expiry Tracking

Expiry tracking is a view/report on top of the Batch system — no new backend entities.

### Backend

**New endpoints on `ProductBatchController`:**
- `GET /api/v1/batches/expiring?withinDays=30&warehouseId=` — batches expiring within N days
- `GET /api/v1/batches/expired?warehouseId=` — already expired batches with remaining stock

**Scheduled job (optional, async):**
- Daily check: auto-transition batches past their expiry date from ACTIVE → EXPIRED status

### Frontend

**Dashboard card: "Expiring Stock"**
- Shows count of batches expiring within 30 days, with total value at risk
- Links to Stock Levels page filtered to expiring batches

**Stock Levels integration:**
- Expiry filter chip: "Next 7d", "Next 30d", "Expired"
- Expiry status chip per batch row with color coding

**No new page created.**

**Files changed:**
- Backend: new endpoints on existing controller, optional scheduled job
- Frontend: enhanced StockLevelsPage, dashboard cards

---

## 4. Damage & Waste

### Backend

**Enhance existing Adjustment system:**

New status values on `adjustments`: `DRAFT` | `PENDING_REVIEW` | `APPROVED` | `REJECTED`

New movement types on `stock_movements`: `DAMAGE` | `WASTE`

New reason codes enum: `EXPIRED` | `BROKEN` | `THEFT` | `QUALITY_DEFECT` | `SPOILAGE` | `OTHER`

**New endpoints on existing `StockController`:**
- `POST /api/v1/adjustments/damage` — create damage record (status: PENDING_REVIEW). Needs `product.update`.
- `POST /api/v1/adjustments/damage/{id}/approve` — supervisor approves. Deducts stock, creates movement. Needs `stock.count`.
- `POST /api/v1/adjustments/damage/{id}/reject` — reject with reason note. Needs `stock.count`.

**Migration:** `V8__damage_waste.sql` — add reason_code to adjustments, add DAMAGE/WASTE to movement_type check constraint.

### Frontend

**New page: `DamageWastePage`**
- Route: `/smartpos/stock/damage`
- Table of damage/waste records with status badges: Pending (warning), Approved (error), Rejected (neutral)
- "Record Damage" button → dialog: product picker, quantity, reason code dropdown, notes
- Supervisor view: "Pending Approval" tab with approve/reject buttons + rejection reason input
- Filters: status, reason code, warehouse, date range

**Dashboard card:**
- "N damage records pending approval" → links to damage page (supervisor only)

**Files created/changed:**
- Backend: enhanced StockController, StockService, migration
- Frontend: `DamageWastePage.tsx`, API layer, route, sidebar update

---

## Sidebar Menu Updates

| Item | Old | New |
|------|-----|-----|
| Reorder Rules | `...soon` | `href: '/smartpos/stock/reorder-rules'` |
| Expiry Tracking | `...soon` | `href: '/smartpos/stock?expiring=true'` (filtered stock view) |
| Batch / Lot Tracking | `...soon` | `href: '/smartpos/stock?batched=true'` (filtered stock view) |
| Damage & Waste | `...soon` | `href: '/smartpos/stock/damage'` |

---

## Route Additions

```ts
// In Router.tsx, under the /smartpos children:
{ path: 'stock/reorder-rules', element: <SmartPosReorderRules /> },
{ path: 'stock/damage', element: <SmartPosDamageWaste /> },
```

---

## Database Migrations

| Migration | Contents |
|-----------|----------|
| `V6__reorder_rules.sql` | reorder_rules table |
| `V7__product_batches.sql` | product_batches table, batchId on stock_movements |
| `V8__damage_waste.sql` | reason_code on adjustments, DAMAGE/WASTE movement types |

---

## Implementation Order

1. **Reorder Rules** — standalone, no dependencies, fastest
2. **Batch/Lot Tracking** — new entity, touch stock movement recording
3. **Expiry Tracking** — views on top of batch data, dashboard cards
4. **Damage & Waste** — enhance existing adjustment system, approval workflow

---

## Testing

- Reorder Rules: verify CRUD, triggered query returns correct products below minQty, PO auto-fill
- Batch/Lot: verify batch creation on goods receipt, FIFO deduction on sale, batch breakdown in stock view
- Expiry Tracking: verify expiry alerts fire at correct thresholds, auto-status transition, dashboard card
- Damage & Waste: verify two-step approval flow, stock deducted only on approve, rejection preserves stock, movement audit trail
