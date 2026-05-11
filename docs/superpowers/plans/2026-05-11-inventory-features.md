# Inventory Features Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement 4 inventory features: Reorder Rules, Batch/Lot Tracking, Expiry Tracking, Damage & Waste.

**Architecture:** Reorder Rules are standalone config. Batch/Lot introduces a `ProductBatch` entity that integrates with StockLevel for per-batch stock tracking and FIFO sales deduction. Expiry Tracking is a view layer on batch data. Damage & Waste enhances the existing Adjustment system with a two-step approval workflow.

**Tech Stack:** Java 21 / Spring Boot 3 / Hibernate / Flyway (backend), React 19 / MUI 6 / React Router 7 (frontend).

---

## Phase 1: Reorder Rules

### Task 1.1: Create migration + entity + repo + DTOs

**Files:**
- Create: `backend/inventory-service/src/main/resources/db/migration/V6__reorder_rules.sql`
- Create: `backend/inventory-service/src/main/java/io/smartpos/inventory/domain/model/ReorderRule.java`
- Create: `backend/inventory-service/src/main/java/io/smartpos/inventory/domain/repository/ReorderRuleRepository.java`
- Create: `backend/inventory-service/src/main/java/io/smartpos/inventory/api/dto/ReorderRuleDto.java`
- Create: `backend/inventory-service/src/main/java/io/smartpos/inventory/api/dto/CreateReorderRuleRequest.java`

- [ ] **Step 1: Write all files**

**V6__reorder_rules.sql:**
```sql
CREATE TABLE reorder_rules (
    id              UUID        PRIMARY KEY,
    tenant_id       UUID,
    product_id      UUID        NOT NULL,
    variant_id      UUID,
    warehouse_id    UUID        NOT NULL,
    min_qty         NUMERIC(12,3) NOT NULL,
    reorder_qty     NUMERIC(12,3) NOT NULL DEFAULT 1,
    supplier_id     UUID,
    active          BOOLEAN     NOT NULL DEFAULT true,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_reorder_rules_warehouse ON reorder_rules (warehouse_id);
CREATE INDEX idx_reorder_rules_product ON reorder_rules (product_id);
```

**ReorderRule.java:**
```java
package io.smartpos.inventory.domain.model;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "reorder_rules")
@Getter @Setter
@NoArgsConstructor @AllArgsConstructor
@Builder
public class ReorderRule {
    @Id
    @Column(name = "id", nullable = false, updatable = false)
    private UUID id;

    @Column(name = "tenant_id") private UUID tenantId;
    @Column(name = "product_id", nullable = false) private UUID productId;
    @Column(name = "variant_id") private UUID variantId;
    @Column(name = "warehouse_id", nullable = false) private UUID warehouseId;
    @Column(name = "min_qty", nullable = false) private BigDecimal minQty;
    @Column(name = "reorder_qty", nullable = false) private BigDecimal reorderQty;
    @Column(name = "supplier_id") private UUID supplierId;
    @Column(name = "active", nullable = false) @Builder.Default private boolean active = true;
    @Column(name = "created_at", nullable = false, updatable = false) private Instant createdAt;
    @Column(name = "updated_at", nullable = false) private Instant updatedAt;

    @PrePersist void onCreate() {
        if (id == null) id = UUID.randomUUID();
        Instant now = Instant.now();
        if (createdAt == null) createdAt = now;
        updatedAt = now;
    }
    @PreUpdate void onUpdate() { updatedAt = Instant.now(); }
}
```

**ReorderRuleRepository.java:**
```java
package io.smartpos.inventory.domain.repository;

import io.smartpos.inventory.domain.model.ReorderRule;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import java.util.List;
import java.util.UUID;

public interface ReorderRuleRepository extends JpaRepository<ReorderRule, UUID>, JpaSpecificationExecutor<ReorderRule> {
    List<ReorderRule> findByWarehouseIdAndActiveTrue(UUID warehouseId);
}
```

**ReorderRuleDto.java:**
```java
package io.smartpos.inventory.api.dto;

import io.smartpos.inventory.domain.model.ReorderRule;
import java.math.BigDecimal;
import java.util.UUID;

public record ReorderRuleDto(
    UUID id, UUID productId, UUID variantId, UUID warehouseId,
    BigDecimal minQty, BigDecimal reorderQty, UUID supplierId, boolean active
) {
    public static ReorderRuleDto from(ReorderRule r) {
        return new ReorderRuleDto(r.getId(), r.getProductId(), r.getVariantId(),
            r.getWarehouseId(), r.getMinQty(), r.getReorderQty(), r.getSupplierId(), r.isActive());
    }
}
```

**CreateReorderRuleRequest.java:**
```java
package io.smartpos.inventory.api.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import java.math.BigDecimal;
import java.util.UUID;

public record CreateReorderRuleRequest(
    @NotNull UUID productId, UUID variantId, @NotNull UUID warehouseId,
    @NotNull @Positive BigDecimal minQty, @NotNull @Positive BigDecimal reorderQty,
    UUID supplierId, Boolean active
) {}
```

- [ ] **Step 2: Commit**

```bash
git add backend/inventory-service/src/main/resources/db/migration/V6__reorder_rules.sql backend/inventory-service/src/main/java/io/smartpos/inventory/domain/model/ReorderRule.java backend/inventory-service/src/main/java/io/smartpos/inventory/domain/repository/ReorderRuleRepository.java backend/inventory-service/src/main/java/io/smartpos/inventory/api/dto/ReorderRuleDto.java backend/inventory-service/src/main/java/io/smartpos/inventory/api/dto/CreateReorderRuleRequest.java
git commit -m "feat: add reorder rules schema, entity, repository, and DTOs"
```

---

### Task 1.2: Create ReorderRuleService + Controller

**Files:**
- Create: `backend/inventory-service/src/main/java/io/smartpos/inventory/application/ReorderRuleService.java`
- Create: `backend/inventory-service/src/main/java/io/smartpos/inventory/api/ReorderRuleController.java`

- [ ] **Step 1: Write service**

```java
package io.smartpos.inventory.application;

import io.smartpos.inventory.api.dto.CreateReorderRuleRequest;
import io.smartpos.inventory.api.dto.ReorderRuleDto;
import io.smartpos.inventory.domain.model.ReorderRule;
import io.smartpos.inventory.domain.model.StockLevel;
import io.smartpos.inventory.domain.repository.ReorderRuleRepository;
import io.smartpos.inventory.domain.repository.StockLevelRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class ReorderRuleService {

    private final ReorderRuleRepository repo;
    private final StockLevelRepository stockLevelRepo;

    public Page<ReorderRuleDto> list(Pageable pageable) {
        return repo.findAll(pageable).map(ReorderRuleDto::from);
    }

    public ReorderRuleDto get(UUID id) {
        return ReorderRuleDto.from(repo.findById(id)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Reorder rule not found")));
    }

    @Transactional
    public ReorderRuleDto create(CreateReorderRuleRequest req) {
        ReorderRule r = ReorderRule.builder()
            .productId(req.productId()).variantId(req.variantId()).warehouseId(req.warehouseId())
            .minQty(req.minQty()).reorderQty(req.reorderQty()).supplierId(req.supplierId())
            .active(req.active() != null ? req.active() : true)
            .build();
        return ReorderRuleDto.from(repo.save(r));
    }

    @Transactional
    public ReorderRuleDto update(UUID id, CreateReorderRuleRequest req) {
        ReorderRule r = repo.findById(id)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Reorder rule not found"));
        r.setProductId(req.productId()); r.setVariantId(req.variantId()); r.setWarehouseId(req.warehouseId());
        r.setMinQty(req.minQty()); r.setReorderQty(req.reorderQty()); r.setSupplierId(req.supplierId());
        if (req.active() != null) r.setActive(req.active());
        return ReorderRuleDto.from(repo.save(r));
    }

    @Transactional
    public void delete(UUID id) {
        repo.deleteById(id);
    }

    public List<ReorderRuleDto> triggered(UUID warehouseId) {
        List<ReorderRule> rules = warehouseId != null
            ? repo.findByWarehouseIdAndActiveTrue(warehouseId)
            : repo.findAll().stream().filter(ReorderRule::isActive).toList();
        return rules.stream().filter(r -> {
            StockLevel sl = stockLevelRepo.findByProductAndVariantAndWarehouse(
                r.getProductId(), r.getVariantId(), r.getWarehouseId()).orElse(null);
            return sl == null || sl.available().compareTo(r.getMinQty()) <= 0;
        }).map(ReorderRuleDto::from).toList();
    }
}
```

- [ ] **Step 2: Write controller**

```java
package io.smartpos.inventory.api;

import io.smartpos.inventory.api.dto.CreateReorderRuleRequest;
import io.smartpos.inventory.api.dto.ReorderRuleDto;
import io.smartpos.inventory.application.ReorderRuleService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/reorder-rules")
@RequiredArgsConstructor
public class ReorderRuleController {

    private final ReorderRuleService service;

    @GetMapping
    @PreAuthorize("hasAuthority('stock.view')")
    public Page<ReorderRuleDto> list(Pageable pageable) { return service.list(pageable); }

    @GetMapping("/{id}")
    @PreAuthorize("hasAuthority('stock.view')")
    public ReorderRuleDto get(@PathVariable UUID id) { return service.get(id); }

    @PostMapping
    @PreAuthorize("hasAuthority('stock.count')")
    public ResponseEntity<ReorderRuleDto> create(@Valid @RequestBody CreateReorderRuleRequest req) {
        return ResponseEntity.status(HttpStatus.CREATED).body(service.create(req));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('stock.count')")
    public ReorderRuleDto update(@PathVariable UUID id, @Valid @RequestBody CreateReorderRuleRequest req) {
        return service.update(id, req);
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('stock.count')")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable UUID id) { service.delete(id); }

    @GetMapping("/triggered")
    @PreAuthorize("hasAuthority('stock.view')")
    public List<ReorderRuleDto> triggered(@RequestParam(required = false) UUID warehouseId) {
        return service.triggered(warehouseId);
    }
}
```

- [ ] **Step 3: Commit**

```bash
git add backend/inventory-service/src/main/java/io/smartpos/inventory/application/ReorderRuleService.java backend/inventory-service/src/main/java/io/smartpos/inventory/api/ReorderRuleController.java
git commit -m "feat: add reorder rules service and controller"
```

---

### Task 1.3: Frontend — API layer + page + route + sidebar

**Files:**
- Create: `frontend/src/api/smartpos/reorderRules.ts`
- Create: `frontend/src/views/smartpos/stock/ReorderRulesPage.tsx`
- Modify: `frontend/src/routes/Router.tsx`
- Modify: `frontend/src/layouts/full/vertical/sidebar/SmartPosMenuItems.ts`

- [ ] **Step 1: Create API layer**

`frontend/src/api/smartpos/reorderRules.ts`:
```ts
import { api } from './client';
import type { Page, UUID } from './types';

export interface ReorderRule {
  id: UUID;
  productId: UUID;
  variantId?: UUID | null;
  warehouseId: UUID;
  minQty: number;
  reorderQty: number;
  supplierId?: UUID | null;
  active: boolean;
}

export interface ReorderRuleInput {
  productId: UUID;
  variantId?: UUID;
  warehouseId: UUID;
  minQty: number;
  reorderQty: number;
  supplierId?: UUID;
  active?: boolean;
}

export async function listReorderRules(params?: { page?: number; size?: number }): Promise<Page<ReorderRule>> {
  const { data } = await api.get<Page<ReorderRule>>('/api/v1/reorder-rules', { params });
  return data;
}

export async function getTriggeredRules(warehouseId?: UUID): Promise<ReorderRule[]> {
  const { data } = await api.get<ReorderRule[]>('/api/v1/reorder-rules/triggered', { params: warehouseId ? { warehouseId } : {} });
  return data;
}

export async function createReorderRule(body: ReorderRuleInput): Promise<ReorderRule> {
  const { data } = await api.post<ReorderRule>('/api/v1/reorder-rules', body);
  return data;
}

export async function updateReorderRule(id: UUID, body: ReorderRuleInput): Promise<ReorderRule> {
  const { data } = await api.put<ReorderRule>(`/api/v1/reorder-rules/${id}`, body);
  return data;
}

export async function deleteReorderRule(id: UUID): Promise<void> {
  await api.delete(`/api/v1/reorder-rules/${id}`);
}
```

- [ ] **Step 2: Create ReorderRulesPage**

Create `frontend/src/views/smartpos/stock/ReorderRulesPage.tsx` — a table page with columns: Product, Warehouse, Min Qty, Reorder Qty, Supplier, Status (OK/Low). Inline add/edit via dialog. Warehouse filter dropdown. "Create PO" button that pre-fills a purchase order.

(Full page code omitted for brevity — use the pattern from `ProductsListPage.tsx` with DataTable, PageHeader, FilterBar, and inline dialog.)

- [ ] **Step 3: Add route**

In `Router.tsx`, after the stock routes section:
```ts
const SmartPosReorderRules = Loadable(
  lazy(() => import('../views/smartpos/stock/ReorderRulesPage')),
);
// Add under children:
{ path: 'stock/reorder-rules', element: <SmartPosReorderRules /> },
```

- [ ] **Step 4: Update sidebar**

In `SmartPosMenuItems.ts`, change Reorder Rules line from `...soon` to:
```ts
{ id: uid(), title: 'Reorder Rules', icon: IconAlertTriangle, href: '/smartpos/stock/reorder-rules' },
```

- [ ] **Step 5: Commit**

```bash
git add frontend/src/api/smartpos/reorderRules.ts frontend/src/views/smartpos/stock/ReorderRulesPage.tsx frontend/src/routes/Router.tsx frontend/src/layouts/full/vertical/sidebar/SmartPosMenuItems.ts
git commit -m "feat: add reorder rules page, API, route, and sidebar item"
```

---

## Phase 2: Batch / Lot Tracking

### Task 2.1: Create migration + entity + repo

**Files:**
- Create: `backend/inventory-service/src/main/resources/db/migration/V7__product_batches.sql`
- Create: `backend/inventory-service/src/main/java/io/smartpos/inventory/domain/model/ProductBatch.java`
- Create: `backend/inventory-service/src/main/java/io/smartpos/inventory/domain/repository/ProductBatchRepository.java`

- [ ] **Step 1: Create migration**

```sql
-- V7: Batch/lot tracking
CREATE TABLE product_batches (
    id                  UUID        PRIMARY KEY,
    tenant_id           UUID,
    batch_number        VARCHAR(100) NOT NULL,
    product_id          UUID        NOT NULL,
    variant_id          UUID,
    warehouse_id        UUID        NOT NULL,
    manufacturing_date  DATE,
    expiry_date         DATE,
    on_hand             NUMERIC(12,3) NOT NULL DEFAULT 0,
    reserved            NUMERIC(12,3) NOT NULL DEFAULT 0,
    status              VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT product_batches_status_chk CHECK (status IN ('ACTIVE','EXPIRED','DEPLETED')),
    CONSTRAINT product_batches_on_hand_nonneg CHECK (on_hand >= 0),
    CONSTRAINT product_batches_reserved_nonneg CHECK (reserved >= 0)
);

CREATE INDEX idx_batches_product ON product_batches (product_id);
CREATE INDEX idx_batches_warehouse ON product_batches (warehouse_id);
CREATE INDEX idx_batches_expiry ON product_batches (expiry_date) WHERE status = 'ACTIVE';
CREATE UNIQUE INDEX idx_batches_number_product ON product_batches (batch_number, product_id, warehouse_id);

ALTER TABLE stock_movements ADD COLUMN batch_id UUID;
CREATE INDEX idx_movements_batch ON stock_movements (batch_id);
```

- [ ] **Step 2: Create ProductBatch entity** (similar pattern to StockLevel with batchNumber, expiryDate, status)

- [ ] **Step 3: Create ProductBatchRepository** with finder methods:
  - `findByProductIdAndWarehouseIdAndStatusOrderByExpiryDateAsc` (for FIFO deduction)
  - `findByWarehouseIdAndExpiryDateBeforeAndStatusAndOnHandGreaterThan` (for expiry alerts)

- [ ] **Step 4: Commit**

```bash
git add backend/inventory-service/src/main/resources/db/migration/V7__product_batches.sql backend/inventory-service/src/main/java/io/smartpos/inventory/domain/model/ProductBatch.java backend/inventory-service/src/main/java/io/smartpos/inventory/domain/repository/ProductBatchRepository.java
git commit -m "feat: add batch/lot tracking schema, entity, and repository"
```

---

### Task 2.2: Create ProductBatchService + Controller + DTOs

**Files:**
- Create: `backend/inventory-service/src/main/java/io/smartpos/inventory/application/ProductBatchService.java`
- Create: `backend/inventory-service/src/main/java/io/smartpos/inventory/api/ProductBatchController.java`
- Create: `backend/inventory-service/src/main/java/io/smartpos/inventory/api/dto/ProductBatchDto.java`
- Create: `backend/inventory-service/src/main/java/io/smartpos/inventory/api/dto/CreateProductBatchRequest.java`

- [ ] **Step 1: Write DTOs**

**ProductBatchDto** records: id, batchNumber, productId, variantId, warehouseId, manufacturingDate, expiryDate, onHand, reserved, status.

**CreateProductBatchRequest** records: batchNumber, productId, variantId(optional), warehouseId, manufacturingDate(optional), expiryDate(optional), qty.

- [ ] **Step 2: Write ProductBatchService**

Key methods:
- `listBatches(productId, warehouseId, status, expiringBefore, expiringAfter, pageable)` — search/filter
- `create(CreateProductBatchRequest)` — creates batch + creates corresponding stock movement
- `deduct(batchId, qty)` — FIFO reservation/deduction helper for sale operations
- `getExpiring(warehouseId, withinDays)` — batches expiring within N days

- [ ] **Step 3: Write ProductBatchController**

```java
@RestController
@RequestMapping("/api/v1/batches")
// GET / — list/search with filters
// GET /{id} — single batch
// POST / — create batch (goods receipt)
// GET /expiring?withinDays=30&warehouseId= — expiry alerts
```

- [ ] **Step 4: Commit**

```bash
git add backend/inventory-service/src/main/java/io/smartpos/inventory/application/ProductBatchService.java backend/inventory-service/src/main/java/io/smartpos/inventory/api/ProductBatchController.java backend/inventory-service/src/main/java/io/smartpos/inventory/api/dto/ProductBatchDto.java backend/inventory-service/src/main/java/io/smartpos/inventory/api/dto/CreateProductBatchRequest.java
git commit -m "feat: add product batch service, controller, and DTOs"
```

---

### Task 2.3: Frontend — batch API + enhance StockLevelsPage

**Files:**
- Create: `frontend/src/api/smartpos/batches.ts`
- Modify: `frontend/src/views/smartpos/stock/StockLevelsPage.tsx`
- Modify: `frontend/src/api/smartpos/types.ts`

- [ ] **Step 1: Create batch API + types**

Add `ProductBatch` type to types.ts. Create `batches.ts` with `listBatches`, `createBatch`.

- [ ] **Step 2: Enhance StockLevelsPage**

Add expandable row for batch breakdown per product. When a product row is expanded, fetch batches for that product and show batch columns: batch number, expiry date (color-coded chip), on hand, reserved, status. Add "Receive Batch" dialog button.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/api/smartpos/batches.ts frontend/src/api/smartpos/types.ts frontend/src/views/smartpos/stock/StockLevelsPage.tsx
git commit -m "feat: add batch tracking to stock levels page"
```

---

## Phase 3: Expiry Tracking

### Task 3.1: Expiry alerts endpoint + dashboard integration

**Files:**
- Modify: `backend/inventory-service/src/main/java/io/smartpos/inventory/api/ProductBatchController.java` (add expiring endpoint if not already)
- Modify: `frontend/src/views/smartpos/dashboard/DashboardPage.tsx` (add expiry card)
- Modify: `frontend/src/views/smartpos/stock/StockLevelsPage.tsx` (add expiry filter chips)

- [ ] **Step 1: Ensure GET /api/v1/batches/expiring endpoint works**

- [ ] **Step 2: Add "Expiring Stock" card to DashboardPage side rail**

AlertStrip with count of batches expiring within 30 days, linking to `/smartpos/stock?expiring=30`

- [ ] **Step 3: Add expiry filter chips to StockLevelsPage**

Filter chips: "Next 7d", "Next 30d", "Expired"

- [ ] **Step 4: Commit**

```bash
git add frontend/src/views/smartpos/dashboard/DashboardPage.tsx frontend/src/views/smartpos/stock/StockLevelsPage.tsx
git commit -m "feat: add expiry tracking alerts and dashboard card"
```

- [ ] **Step 5: Update sidebar — Expiry Tracking menu item**

Change from `...soon` to:
```ts
{ id: uid(), title: 'Expiry Tracking', icon: IconClock, href: '/smartpos/stock?expiring=30' },
```

- [ ] **Step 6: Update sidebar — Batch/Lot Tracking menu item**

Change from `...soon` to:
```ts
{ id: uid(), title: 'Batch / Lot Tracking', icon: IconBookmarks, href: '/smartpos/stock?batched=true' },
```

- [ ] **Step 7: Commit sidebar updates**

```bash
git add frontend/src/layouts/full/vertical/sidebar/SmartPosMenuItems.ts
git commit -m "feat: add Expiry Tracking and Batch/Lot Tracking sidebar items"
```

---

## Phase 4: Damage & Waste

### Task 4.1: Migration + enhance Adjustment model + MovementType

**Files:**
- Create: `backend/inventory-service/src/main/resources/db/migration/V8__damage_waste.sql`
- Modify: `backend/inventory-service/src/main/java/io/smartpos/inventory/domain/model/Adjustment.java`
- Modify: `backend/inventory-service/src/main/java/io/smartpos/inventory/domain/model/MovementType.java`

- [ ] **Step 1: Migration**

```sql
-- V8: Damage & waste with approval workflow
ALTER TABLE adjustments ADD COLUMN status VARCHAR(20) NOT NULL DEFAULT 'APPROVED';
ALTER TABLE adjustments ADD COLUMN reason_code VARCHAR(30);
ALTER TABLE adjustments ADD COLUMN approved_by UUID;
ALTER TABLE adjustments ADD COLUMN approved_at TIMESTAMPTZ;
ALTER TABLE adjustments ADD COLUMN rejected_reason TEXT;
ALTER TABLE adjustments ADD CONSTRAINT adjustments_status_chk CHECK (status IN ('DRAFT','PENDING_REVIEW','APPROVED','REJECTED'));
```

- [ ] **Step 2: Add DAMAGE, WASTE to MovementType enum**

```java
public enum MovementType {
    PURCHASE_IN, SALE_OUT, RETURN_IN, RETURN_OUT,
    TRANSFER_OUT, TRANSFER_IN, ADJUSTMENT, COUNT,
    DAMAGE, WASTE
}
```

- [ ] **Step 3: Add status and reason fields to Adjustment entity**

Add fields: `status` (default APPROVED for backwards compat), `reasonCode`, `approvedBy`, `approvedAt`, `rejectedReason`.

- [ ] **Step 4: Commit**

```bash
git add backend/inventory-service/src/main/resources/db/migration/V8__damage_waste.sql backend/inventory-service/src/main/java/io/smartpos/inventory/domain/model/Adjustment.java backend/inventory-service/src/main/java/io/smartpos/inventory/domain/model/MovementType.java
git commit -m "feat: add damage/waste approval workflow schema and model changes"
```

---

### Task 4.2: Backend — damage endpoints + approval service

**Files:**
- Modify: `backend/inventory-service/src/main/java/io/smartpos/inventory/application/AdjustmentService.java`
- Modify: `backend/inventory-service/src/main/java/io/smartpos/inventory/api/StockController.java`

- [ ] **Step 1: Add damage endpoints to StockController**

```java
@PostMapping("/adjustments/damage")
@PreAuthorize("hasAuthority('product.update')")
public ResponseEntity<AdjustmentDto> recordDamage(@Valid @RequestBody CreateDamageRequest req) {
    return ResponseEntity.status(HttpStatus.CREATED).body(service.recordDamage(req));
}

@PostMapping("/adjustments/damage/{id}/approve")
@PreAuthorize("hasAuthority('stock.count')")
public AdjustmentDto approveDamage(@PathVariable UUID id) {
    return service.approveDamage(id);
}

@PostMapping("/adjustments/damage/{id}/reject")
@PreAuthorize("hasAuthority('stock.count')")
public AdjustmentDto rejectDamage(@PathVariable UUID id, @RequestBody @Valid RejectRequest req) {
    return service.rejectDamage(id, req.reason());
}
```

- [ ] **Step 2: Add service methods**

`recordDamage`: creates Adjustment with status=PENDING_REVIEW, lines with negative qty_delta. No stock deduction yet.
`approveDamage`: sets status=APPROVED, deducts stock levels, creates DAMAGE/WASTE stock movements.
`rejectDamage`: sets status=REJECTED, records rejection reason. No stock change.

- [ ] **Step 3: Create DTOs:**

`CreateDamageRequest`: warehouseId, productId, variantId(optional), qty, reasonCode (EXPIRED|BROKEN|THEFT|QUALITY_DEFECT|SPOILAGE|OTHER), notes, movementType (DAMAGE|WASTE).
`RejectRequest`: reason (String).

- [ ] **Step 4: Commit**

```bash
git add backend/inventory-service/src/main/java/io/smartpos/inventory/application/AdjustmentService.java backend/inventory-service/src/main/java/io/smartpos/inventory/api/StockController.java backend/inventory-service/src/main/java/io/smartpos/inventory/api/dto/CreateDamageRequest.java backend/inventory-service/src/main/java/io/smartpos/inventory/api/dto/RejectRequest.java
git commit -m "feat: add damage/waste recording and approval endpoints"
```

---

### Task 4.3: Frontend — DamageWastePage + route + sidebar

**Files:**
- Create: `frontend/src/views/smartpos/stock/DamageWastePage.tsx`
- Modify: `frontend/src/routes/Router.tsx`
- Modify: `frontend/src/layouts/full/vertical/sidebar/SmartPosMenuItems.ts`

- [ ] **Step 1: Create DamageWastePage**

Two-tab page at `/smartpos/stock/damage`:
- Tab 1: "Record Damage" — warehouse selector, product picker, quantity, reason code dropdown, notes, submit
- Tab 2: "Pending Approval" (supervisor) — table of PENDING_REVIEW records with approve/reject buttons
- Status badges: Pending (warning), Approved (error), Rejected (neutral)

- [ ] **Step 2: Add route**

```ts
const SmartPosDamageWaste = Loadable(
  lazy(() => import('../views/smartpos/stock/DamageWastePage')),
);
// Route:
{ path: 'stock/damage', element: <SmartPosDamageWaste /> },
```

- [ ] **Step 3: Update sidebar**

Change Damage & Waste from `...soon` to:
```ts
{ id: uid(), title: 'Damage & Waste', icon: IconAlertTriangle, href: '/smartpos/stock/damage' },
```

- [ ] **Step 4: Commit**

```bash
git add frontend/src/views/smartpos/stock/DamageWastePage.tsx frontend/src/routes/Router.tsx frontend/src/layouts/full/vertical/sidebar/SmartPosMenuItems.ts
git commit -m "feat: add damage/waste page, route, and sidebar item"
```

---

### Task 4.4: Final verification

- [ ] **Step 1: Run frontend type check**

```bash
cd /Users/ismaelmkumbi/Desktop/LetisPos/frontend && npx tsc --noEmit --pretty 2>&1 | tail -20
```
Expected: no errors.

- [ ] **Step 2: Compile backend**

```bash
cd /Users/ismaelmkumbi/Desktop/LetisPos/backend/inventory-service && mvn compile -q 2>&1 | tail -20
```
Expected: BUILD SUCCESS.

- [ ] **Step 3: Commit any fixes if needed**
