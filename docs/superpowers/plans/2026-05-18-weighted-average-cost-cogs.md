# Weighted Average Cost COGS Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the inaccurate `purchases.gross`-as-COGS approximation with proper weighted average cost (WAC) captured at sale time and aggregated from `sale_lines.unit_cost`.

**Architecture:** Add `weighted_avg_cost` to `stock_levels`, recalculate it on purchase receipt, add `unit_cost` to `sale_lines`, snapshot WAC at sale creation time, and wire COGS from sale lines into the dashboard and P&L reports. The frontend `BusinessPulseCard` gains a COGS stat so the math becomes transparent.

**Tech Stack:** Java 17 (Spring Boot, JPA/Hibernate, Flyway, Feign), TypeScript (React, MUI), PostgreSQL

---

## File Map

| Layer | File | Action |
|---|---|---|
| DB (inventory) | `inventory-service/.../db/migration/V13__stock_weighted_avg_cost.sql` | Create |
| DB (sales) | `sales-service/.../db/migration/V15__sale_line_unit_cost.sql` | Create |
| Inventory domain | `inventory/domain/model/StockLevel.java` | Modify |
| Inventory service | `inventory/application/AdjustmentService.java` | Modify |
| Inventory controller | `inventory/api/StockController.java` | Create |
| Inventory DTO | `inventory/api/dto/StockCostDto.java` | Create |
| Sales Feign (inventory) | `sales/infrastructure/feign/InventoryClient.java` | Modify |
| Sales domain | `sales/domain/model/SaleLine.java` | Modify |
| Sales service | `sales/application/SaleService.java` | Modify |
| Sales DTO | `sales/api/dto/SaleDto.java` | Modify |
| Sales controller | `sales/api/SaleController.java` | Modify |
| Sales repo | `sales/domain/repository/SaleRepository.java` | Modify |
| Report Feign (sales) | `report/infrastructure/feign/SalesFeign.java` | Modify |
| Report service | `report/application/DashboardService.java` | Modify |
| Report service | `report/application/ProfitLossService.java` | Modify |
| Report DTO | `report/api/dto/DashboardDto.java` | Modify |
| Frontend API types | `api/smartpos/reports.ts` | Modify |
| Frontend card | `views/smartpos/dashboard/BusinessPulseCard.tsx` | Modify |
| Frontend parent | `views/smartpos/dashboard/DashboardPage.tsx` | Modify |

---

### Task 1: Inventory Service — DB migration for weighted_avg_cost

**Files:**
- Create: `backend/inventory-service/src/main/resources/db/migration/V13__stock_weighted_avg_cost.sql`

- [ ] **Step 1: Write the migration**

```sql
ALTER TABLE stock_levels
    ADD COLUMN IF NOT EXISTS weighted_avg_cost DECIMAL(19,4) NOT NULL DEFAULT 0;
```

- [ ] **Step 2: Run the migration to verify it applies**

Run: `cd backend/inventory-service && mvn flyway:migrate -pl . --also-make -Dflyway.locations=filesystem:src/main/resources/db/migration 2>&1 | tail -5`
Expected: "Successfully applied 1 migration" or "Schema is up to date"

- [ ] **Step 3: Commit**

```bash
git add backend/inventory-service/src/main/resources/db/migration/V13__stock_weighted_avg_cost.sql
git commit -m "feat: add weighted_avg_cost column to stock_levels"
```

---

### Task 2: Inventory Service — StockLevel entity and WAC recalculation

**Files:**
- Modify: `backend/inventory-service/src/main/java/io/smartpos/inventory/domain/model/StockLevel.java`
- Modify: `backend/inventory-service/src/main/java/io/smartpos/inventory/application/AdjustmentService.java`

- [ ] **Step 1: Add weightedAvgCost field to StockLevel entity**

In `StockLevel.java`, add after the `reserved` field (after line 35):

```java
@Column(name = "weighted_avg_cost", nullable = false)
@Builder.Default
private BigDecimal weightedAvgCost = BigDecimal.ZERO;
```

- [ ] **Step 2: Add recalculateWac method to StockLevel**

Add after the `applyDelta` method (after line 108):

```java
/**
 * Recalculate weighted average cost BEFORE receiving new stock.
 * Call this BEFORE applyDelta so current onHand is pre-receipt.
 * newWAC = (onHand * currentWAC + receivedQty * receivedUnitCost) / (onHand + receivedQty)
 */
public void recalculateWac(BigDecimal receivedQty, BigDecimal receivedUnitCost) {
    if (receivedQty.signum() <= 0) return;
    BigDecimal currentValue = this.onHand.multiply(this.weightedAvgCost);
    BigDecimal receivedValue = receivedQty.multiply(receivedUnitCost);
    BigDecimal totalQty = this.onHand.add(receivedQty);
    if (totalQty.compareTo(BigDecimal.ZERO) > 0) {
        this.weightedAvgCost = currentValue.add(receivedValue)
                .divide(totalQty, 4, java.math.RoundingMode.HALF_UP);
    }
}
```

Add `import java.math.RoundingMode;` to the imports at the top.

- [ ] **Step 3: Trigger WAC recalculation in AdjustmentService when receiving purchase stock**

In `AdjustmentService.java`, the `create` method at line 51. The problem: the current flow doesn't pass purchase line cost into the adjustment. We need to add an optional `unitCost` to the `AdjustmentLine` DTO and the `AdjustmentLine` domain model.

First, add `unitCost` to `AdjustmentDto.CreateRequest.Line`:

In `backend/inventory-service/src/main/java/io/smartpos/inventory/api/dto/AdjustmentDto.java`, find the `Line` record inside `CreateRequest` and add:

```java
record Line(UUID productId, UUID variantId, BigDecimal qtyDelta,
            BigDecimal unitCost) {
    public Line(UUID productId, UUID variantId, BigDecimal qtyDelta) {
        this(productId, variantId, qtyDelta, null);
    }
}
```

Add `import java.math.BigDecimal;` if not present.

In `AdjustmentService.java`, modify the create method. Change the line creation block (lines 66-72) from:

```java
req.lines().forEach(l -> {
    AdjustmentLine line = AdjustmentLine.builder()
            .adjustment(a)
            .productId(l.productId())
            .variantId(l.variantId())
            .qtyDelta(l.qtyDelta())
            .build();
    a.getLines().add(line);
});
```

To:

```java
req.lines().forEach(l -> {
    AdjustmentLine line = AdjustmentLine.builder()
            .adjustment(a)
            .productId(l.productId())
            .variantId(l.variantId())
            .qtyDelta(l.qtyDelta())
            .unitCost(l.unitCost())
            .build();
    a.getLines().add(line);
});
```

Then modify the stock processing loop (lines 76-98) from:

```java
for (AdjustmentLine l : saved.getLines()) {
    StockLevel s = stockService.upsert(l.getProductId(), l.getVariantId(), a.getWarehouseId());
    try { s.applyDelta(l.getQtyDelta()); }
    catch (IllegalStateException e) {
        throw new ResponseStatusException(HttpStatus.CONFLICT, e.getMessage());
    }
    stockRepo.save(s);
    ...
}
```

To:

```java
for (AdjustmentLine l : saved.getLines()) {
    StockLevel s = stockService.upsert(l.getProductId(), l.getVariantId(), a.getWarehouseId());
    // Recalculate WAC if this is a stock-in with a known unit cost (e.g. from purchase receipt)
    if (l.getQtyDelta().signum() > 0 && l.getUnitCost() != null && l.getUnitCost().signum() > 0) {
        s.recalculateWac(l.getQtyDelta(), l.getUnitCost());
    }
    try { s.applyDelta(l.getQtyDelta()); }
    catch (IllegalStateException e) {
        throw new ResponseStatusException(HttpStatus.CONFLICT, e.getMessage());
    }
    stockRepo.save(s);
    ...
}
```

- [ ] **Step 4: Add unitCost field to AdjustmentLine domain model**

In `backend/inventory-service/src/main/java/io/smartpos/inventory/domain/model/AdjustmentLine.java`, add after `qtyDelta`:

```java
@Column(name = "unit_cost")
private BigDecimal unitCost;
```

Add `import java.math.BigDecimal;` if not present.

Also add a DB migration for this column:

Create `backend/inventory-service/src/main/resources/db/migration/V14__adjustment_line_unit_cost.sql`:

```sql
ALTER TABLE adjustment_lines
    ADD COLUMN IF NOT EXISTS unit_cost DECIMAL(19,4);
```

- [ ] **Step 5: Update InventoryClient in sales-service to pass unitCost on purchase receipt**

In `backend/sales-service/src/main/java/io/smartpos/sales/infrastructure/feign/InventoryClient.java`, change the `AdjustmentLine` record (line 38) from:

```java
record AdjustmentLine(UUID productId, UUID variantId, BigDecimal qtyDelta) {}
```

To:

```java
record AdjustmentLine(UUID productId, UUID variantId, BigDecimal qtyDelta, BigDecimal unitCost) {}
```

And in `PurchaseService.java` line 121, change the adjustment line construction from:

```java
.map(l -> new InventoryClient.AdjustmentLine(l.getProductId(), l.getVariantId(), l.getQty()))
```

To:

```java
.map(l -> new InventoryClient.AdjustmentLine(l.getProductId(), l.getVariantId(), l.getQty(), l.getUnitCost()))
```

- [ ] **Step 6: Commit**

```bash
git add backend/inventory-service/src/main/java/io/smartpos/inventory/domain/model/StockLevel.java \
        backend/inventory-service/src/main/java/io/smartpos/inventory/application/AdjustmentService.java \
        backend/inventory-service/src/main/java/io/smartpos/inventory/api/dto/AdjustmentDto.java \
        backend/inventory-service/src/main/java/io/smartpos/inventory/domain/model/AdjustmentLine.java \
        backend/inventory-service/src/main/resources/db/migration/V14__adjustment_line_unit_cost.sql \
        backend/sales-service/src/main/java/io/smartpos/sales/infrastructure/feign/InventoryClient.java \
        backend/sales-service/src/main/java/io/smartpos/sales/application/PurchaseService.java
git commit -m "feat: recalculate weighted average cost on purchase receipt"
```

---

### Task 3: Inventory Service — Expose WAC via endpoint for sale-time lookup

**Files:**
- Create: `backend/inventory-service/src/main/java/io/smartpos/inventory/api/StockController.java`
- Create: `backend/inventory-service/src/main/java/io/smartpos/inventory/api/dto/StockCostDto.java`
- Modify: `backend/inventory-service/src/main/java/io/smartpos/inventory/domain/repository/StockLevelRepository.java`
- Modify: `backend/sales-service/src/main/java/io/smartpos/sales/infrastructure/feign/InventoryClient.java`

- [ ] **Step 1: Add repository query for batch cost lookup**

In `StockLevelRepository.java`, add after the `findByWarehouseAndProducts` method (after line 83):

```java
/** Batch read for WAC values — no lock needed (reads at sale creation time). */
@Query("""
       SELECT s FROM StockLevel s
       WHERE s.warehouseId = :warehouseId
         AND s.productId IN (:productIds)
         AND s.tenantId = :tenantId
       """)
List<StockLevel> findCostsByWarehouseAndProducts(@Param("warehouseId") UUID warehouseId,
                                                  @Param("productIds") List<UUID> productIds,
                                                  @Param("tenantId") UUID tenantId);
```

- [ ] **Step 2: Create StockCostDto**

Create `backend/inventory-service/src/main/java/io/smartpos/inventory/api/dto/StockCostDto.java`:

```java
package io.smartpos.inventory.api.dto;

import io.smartpos.inventory.domain.model.StockLevel;

import java.math.BigDecimal;
import java.util.UUID;

public record StockCostDto(
        UUID productId,
        UUID variantId,
        BigDecimal weightedAvgCost
) {
    public static StockCostDto from(StockLevel s) {
        return new StockCostDto(s.getProductId(), s.getVariantId(), s.getWeightedAvgCost());
    }
}
```

- [ ] **Step 3: Create StockController with cost endpoint**

Create `backend/inventory-service/src/main/java/io/smartpos/inventory/api/StockController.java`:

```java
package io.smartpos.inventory.api;

import io.smartpos.common.context.TenantContext;
import io.smartpos.inventory.api.dto.StockCostDto;
import io.smartpos.inventory.domain.repository.StockLevelRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/stock")
@RequiredArgsConstructor
public class StockController {

    private final StockLevelRepository stockRepo;

    @GetMapping("/costs")
    public List<StockCostDto> getCosts(@RequestParam UUID warehouseId,
                                        @RequestParam List<UUID> productIds) {
        UUID tenantId = TenantContext.require();
        return stockRepo.findCostsByWarehouseAndProducts(warehouseId, productIds, tenantId)
                .stream()
                .map(StockCostDto::from)
                .toList();
    }
}
```

- [ ] **Step 4: Add cost lookup method to InventoryClient in sales-service**

In `backend/sales-service/src/main/java/io/smartpos/sales/infrastructure/feign/InventoryClient.java`, add:

```java
record StockCostDto(UUID productId, UUID variantId, BigDecimal weightedAvgCost) {}

@GetMapping("/api/v1/stock/costs")
List<StockCostDto> getCosts(@RequestParam("warehouseId") UUID warehouseId,
                            @RequestParam("productIds") List<UUID> productIds);
```

Add `import java.util.UUID;` and `import java.math.BigDecimal;` if not already present.

- [ ] **Step 5: Commit**

```bash
git add backend/inventory-service/src/main/java/io/smartpos/inventory/api/StockController.java \
        backend/inventory-service/src/main/java/io/smartpos/inventory/api/dto/StockCostDto.java \
        backend/inventory-service/src/main/java/io/smartpos/inventory/domain/repository/StockLevelRepository.java \
        backend/sales-service/src/main/java/io/smartpos/sales/infrastructure/feign/InventoryClient.java
git commit -m "feat: expose weighted average cost endpoint for sale-time lookup"
```

---

### Task 4: Sales Service — DB migration and SaleLine entity

**Files:**
- Create: `backend/sales-service/src/main/resources/db/migration/V15__sale_line_unit_cost.sql`
- Modify: `backend/sales-service/src/main/java/io/smartpos/sales/domain/model/SaleLine.java`
- Modify: `backend/sales-service/src/main/java/io/smartpos/sales/api/dto/SaleDto.java`

- [ ] **Step 1: Write the migration**

Create `backend/sales-service/src/main/resources/db/migration/V15__sale_line_unit_cost.sql`:

```sql
ALTER TABLE sale_lines
    ADD COLUMN IF NOT EXISTS unit_cost DECIMAL(19,4) NOT NULL DEFAULT 0;
```

- [ ] **Step 2: Add unitCost field to SaleLine entity**

In `SaleLine.java`, after the `unitPrice` field (line 33), add:

```java
@Column(name = "unit_cost", nullable = false)
@Builder.Default
private BigDecimal unitCost = BigDecimal.ZERO;
```

- [ ] **Step 3: Add unitCost to SaleDto.Line record and from() mapping**

In `SaleDto.java`, update the `Line` record (lines 38-45) to add `unitCost`:

```java
public record Line(
        UUID id, UUID productId, UUID variantId,
        String productName, String productCode,
        BigDecimal unitPrice, BigDecimal unitCost, BigDecimal qty,
        BigDecimal discount, DiscountType discountType,
        BigDecimal taxRate, TaxMethod taxMethod,
        BigDecimal lineSubtotal, BigDecimal lineTax, BigDecimal lineTotal
) {
    public static Line from(SaleLine l) {
        return new Line(l.getId(), l.getProductId(), l.getVariantId(),
                l.getProductNameSnapshot(), l.getProductCodeSnapshot(),
                l.getUnitPrice(), l.getUnitCost(), l.getQty(),
                l.getDiscount(), l.getDiscountType(),
                l.getTaxRate(), l.getTaxMethod(),
                l.getLineSubtotal(), l.getLineTax(), l.getLineTotal());
    }
}
```

- [ ] **Step 4: Commit**

```bash
git add backend/sales-service/src/main/resources/db/migration/V15__sale_line_unit_cost.sql \
        backend/sales-service/src/main/java/io/smartpos/sales/domain/model/SaleLine.java \
        backend/sales-service/src/main/java/io/smartpos/sales/api/dto/SaleDto.java
git commit -m "feat: add unit_cost column to sale_lines"
```

---

### Task 5: Sales Service — Snapshot WAC at sale creation time

**Files:**
- Modify: `backend/sales-service/src/main/java/io/smartpos/sales/application/SaleService.java`

- [ ] **Step 1: Fetch WAC and snapshot on each sale line during creation**

In `SaleService.java`, in the `create` method. After building the sale lines but before `saleRepo.save(sale)` (after line 253), add a WAC lookup. Insert after the for-loop that builds lines (after line 254):

```java
// Snapshot weighted average cost from Inventory for each line
List<UUID> productIds = sale.getLines().stream()
        .map(SaleLine::getProductId)
        .distinct()
        .toList();
if (!productIds.isEmpty()) {
    try {
        var costs = inventory.getCosts(sale.getWarehouseId(), productIds);
        var costMap = costs.stream().collect(java.util.stream.Collectors.toMap(
                c -> c.productId(),
                c -> c.weightedAvgCost(),
                (a, b) -> a));
        for (SaleLine line : sale.getLines()) {
            BigDecimal wac = costMap.get(line.getProductId());
            if (wac != null && wac.signum() > 0) {
                line.setUnitCost(wac);
            }
        }
    } catch (Exception e) {
        log.warn("Could not fetch WAC for sale {}: {}", sale.getId(), e.getMessage());
        // sale proceeds with unitCost = 0 (default) — non-blocking
    }
}
```

- [ ] **Step 2: Commit**

```bash
git add backend/sales-service/src/main/java/io/smartpos/sales/application/SaleService.java
git commit -m "feat: snapshot weighted average cost on sale lines at creation"
```

---

### Task 6: Sales Service — COGS aggregation endpoint

**Files:**
- Modify: `backend/sales-service/src/main/java/io/smartpos/sales/domain/repository/SaleRepository.java`
- Modify: `backend/sales-service/src/main/java/io/smartpos/sales/api/SaleController.java`

- [ ] **Step 1: Add COGS aggregation query to SaleRepository**

In `SaleRepository.java`, add after the `findSalesByUser` method (after line 74):

```java
@Query("""
       SELECT COALESCE(SUM(sl.unitCost * sl.qty), 0)
       FROM Sale s JOIN s.lines sl
       WHERE s.status = 'CONFIRMED'
         AND s.date BETWEEN :dateFrom AND :dateTo
         AND (:warehouseId IS NULL OR s.warehouseId = :warehouseId)
         AND s.tenantId = :tenantId
       """)
BigDecimal costOfGoodsSold(@Param("tenantId") UUID tenantId,
                           @Param("dateFrom") LocalDate dateFrom,
                           @Param("dateTo") LocalDate dateTo,
                           @Param("warehouseId") UUID warehouseId);
```

Add `import java.math.BigDecimal;` to imports.

- [ ] **Step 2: Add controller endpoint for COGS**

In `SaleController.java`, add after the `salesByUser` endpoint (after line 103):

```java
@GetMapping("/cogs")
public BigDecimal costOfGoodsSold(@RequestParam(required = false) LocalDate dateFrom,
                                   @RequestParam(required = false) LocalDate dateTo,
                                   @RequestParam(required = false) UUID warehouseId) {
    UUID tenantId = TenantContext.require();
    LocalDate from = dateFrom != null ? dateFrom : LocalDate.now().withDayOfMonth(1);
    LocalDate to = dateTo != null ? dateTo : LocalDate.now();
    return saleRepo.costOfGoodsSold(tenantId, from, to, warehouseId);
}
```

Add imports:
```java
import java.time.LocalDate;
import io.smartpos.common.context.TenantContext;
```

Check if `TenantContext` is already imported — it's already used in the service. But check if it's imported in the controller. Let's see: the controller likely doesn't have it. Add it.

Actually, `saleService` is already wired into the controller. Let's add the method to `SaleService` instead, since the controller delegates to the service:

In `SaleService.java`, add:

```java
@Transactional(readOnly = true)
public BigDecimal costOfGoodsSold(LocalDate dateFrom, LocalDate dateTo, UUID warehouseId) {
    UUID tenantId = TenantContext.require();
    return saleRepo.costOfGoodsSold(tenantId, dateFrom, dateTo, warehouseId);
}
```

Then in `SaleController.java`, add:

```java
@GetMapping("/cogs")
public BigDecimal costOfGoodsSold(@RequestParam(required = false) LocalDate dateFrom,
                                   @RequestParam(required = false) LocalDate dateTo,
                                   @RequestParam(required = false) UUID warehouseId) {
    LocalDate from = dateFrom != null ? dateFrom : LocalDate.now().withDayOfMonth(1);
    LocalDate to = dateTo != null ? dateTo : LocalDate.now();
    return saleService.costOfGoodsSold(from, to, warehouseId);
}
```

Add `import java.time.LocalDate;` to `SaleController.java`.

- [ ] **Step 3: Commit**

```bash
git add backend/sales-service/src/main/java/io/smartpos/sales/domain/repository/SaleRepository.java \
        backend/sales-service/src/main/java/io/smartpos/sales/api/SaleController.java \
        backend/sales-service/src/main/java/io/smartpos/sales/application/SaleService.java
git commit -m "feat: add COGS aggregation endpoint from sale lines"
```

---

### Task 7: Report Service — Wire real COGS into dashboard and P&L

**Files:**
- Modify: `backend/report-service/src/main/java/io/smartpos/report/infrastructure/feign/SalesFeign.java`
- Modify: `backend/report-service/src/main/java/io/smartpos/report/application/DashboardService.java`
- Modify: `backend/report-service/src/main/java/io/smartpos/report/application/ProfitLossService.java`
- Modify: `backend/report-service/src/main/java/io/smartpos/report/api/dto/DashboardDto.java`

- [ ] **Step 1: Add COGS Feign method to SalesFeign**

In `SalesFeign.java`, add after the `salesSeries` method (after line 53):

```java
@GetMapping("/api/v1/sales/cogs")
BigDecimal costOfGoodsSold(@RequestParam("dateFrom") LocalDate dateFrom,
                           @RequestParam("dateTo") LocalDate dateTo,
                           @RequestParam("warehouseId") UUID warehouseId);
```

Add `import java.math.BigDecimal;` if not already imported.

- [ ] **Step 2: Add cogs field to DashboardDto**

In `DashboardDto.java`, add `cogs` to the record parameters, after `netProfit`:

```java
BigDecimal netProfit,         // sales.net - cogs - expenses.total
BigDecimal cogs               // SUM(sale_lines.unit_cost * qty)
```

Update the JavaDoc comment on `netProfit` from `sales.net - expenses.total - purchases.net(cost)` to `sales.net - cogs - expenses.total`.

- [ ] **Step 3: Update DashboardService to use real COGS**

In `DashboardService.java`, update the `dashboard` method (lines 43-76).

Change lines 58-60 from:

```java
// Net profit (rough) = sales.net - purchases.net (≈cogs) - expenses.total
BigDecimal cogs = nz(p.gross()).subtract(BigDecimal.ZERO);   // purchases gross treated as cost
BigDecimal netProfit = nz(s.net()).subtract(cogs).subtract(nz(exp.total()));
```

To:

```java
// COGS from sale lines (weighted avg cost captured at sale time)
BigDecimal cogs = safeCogs(from, to, warehouseId);
BigDecimal netProfit = nz(s.net()).subtract(cogs).subtract(nz(exp.total()));
```

Update the `DashboardDto` constructor call (line 74) to include `cogs` as the last parameter:

```java
netProfit,
cogs
```

Add the `safeCogs` helper method after `safeTopProducts` (after line 110):

```java
private BigDecimal safeCogs(LocalDate from, LocalDate to, UUID warehouseId) {
    try { return sales.costOfGoodsSold(from, to, warehouseId); }
    catch (Exception e) { log.warn("sales.costOfGoodsSold failed: {}", e.getMessage());
        return BigDecimal.ZERO; }
}
```

Add `import java.math.BigDecimal;` if not already imported.

- [ ] **Step 4: Update ProfitLossService to use real COGS**

In `ProfitLossService.java`, change lines 38-44 from:

```java
BigDecimal cogs            = nz(p.gross());
```

To:

```java
BigDecimal cogs;
try {
    cogs = sales.costOfGoodsSold(from, to, null);
} catch (Exception e) {
    log.warn("costOfGoodsSold failed: {}", e.getMessage());
    cogs = nz(p.gross()); // fallback to purchase-based approximation
}
```

Remove the `PurchaseStats p` variable declaration if it's only used for COGS. Check: `p` at line 39 is `sales.purchaseStats(from, to, null)`. The `p` variable is only used for `cogs`. After this change, remove:

```java
SalesFeign.PurchaseStats  p   = sales.purchaseStats(from, to, null);
```

And the `cogs` variable is now fetched via Feign directly.

- [ ] **Step 5: Commit**

```bash
git add backend/report-service/src/main/java/io/smartpos/report/infrastructure/feign/SalesFeign.java \
        backend/report-service/src/main/java/io/smartpos/report/application/DashboardService.java \
        backend/report-service/src/main/java/io/smartpos/report/application/ProfitLossService.java \
        backend/report-service/src/main/java/io/smartpos/report/api/dto/DashboardDto.java
git commit -m "feat: wire real COGS from sale lines into dashboard and P&L reports"
```

---

### Task 8: Frontend — Update types and BusinessPulseCard

**Files:**
- Modify: `frontend/src/api/smartpos/reports.ts`
- Modify: `frontend/src/views/smartpos/dashboard/BusinessPulseCard.tsx`
- Modify: `frontend/src/views/smartpos/dashboard/DashboardPage.tsx`

- [ ] **Step 1: Add cogs to Dashboard type**

In `reports.ts`, add `cogs` to the `Dashboard` interface after `netProfit` (line 28):

```typescript
export interface Dashboard {
  from: string;
  to: string;
  sales: {
    count: number; gross: number; tax: number; discount: number;
    net: number; paid: number; due: number;
  };
  purchases: { count: number; gross: number; paid: number; due: number };
  payments: { count: number; totalIn: number; totalOut: number };
  expenses: { total: number; count: number };
  inventory: {
    distinctProducts: number; totalOnHand: number;
    totalAvailable: number; lowStockLines: number;
  };
  salesSeries: { date: string; net: number; count: number }[];
  topProducts: { productId: string; name: string; qty: number; revenue: number }[];
  netProfit: number;
  cogs: number;
}
```

- [ ] **Step 2: Update BusinessPulseCard to show COGS as a supporting stat**

In `BusinessPulseCard.tsx`, change the `supportStats` array (lines 63-79) to include COGS:

Replace:

```typescript
const supportStats = [
  {
    label: 'Revenue',
    value: formatMoney(revenue),
    sub: 'net sales',
  },
  {
    label: 'Expenses',
    value: formatMoney(expenses),
    sub: 'total costs',
  },
  {
    label: 'Margin',
    value: `${margin.toFixed(1)}%`,
    sub: margin >= 20 ? 'healthy' : margin >= 10 ? 'marginal' : 'needs attention',
  },
];
```

With:

```typescript
const cogs = data?.cogs ?? 0;
const cogsLabel = cogs > 0 && revenue > 0
  ? `${((cogs / revenue) * 100).toFixed(0)}% of revenue`
  : 'cost of goods sold';

const supportStats = [
  {
    label: 'Revenue',
    value: formatMoney(revenue),
    sub: 'net sales',
  },
  {
    label: 'COGS',
    value: formatMoney(cogs),
    sub: cogsLabel,
  },
  {
    label: 'Expenses',
    value: formatMoney(expenses),
    sub: 'total costs',
  },
  {
    label: 'Margin',
    value: `${margin.toFixed(1)}%`,
    sub: margin >= 20 ? 'healthy' : margin >= 10 ? 'marginal' : 'needs attention',
  },
];
```

This changes the bottom row from 3 stats (Revenue, Expenses, Margin) to 4 stats (Revenue, COGS, Expenses, Margin). Each stat column is `flex: 1`, so they'll auto-size to 25% each.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/api/smartpos/reports.ts \
        frontend/src/views/smartpos/dashboard/BusinessPulseCard.tsx
git commit -m "feat: show COGS stat on Business Pulse card"
```

---

### Task 9: Frontend — Update ProfitLossPage to use real COGS

**Files:**
- Modify: `frontend/src/views/smartpos/reports/ProfitLossPage.tsx`

- [ ] **Step 1: Check ProfitLossPage and verify it already uses cogs from the API**

Read the current `ProfitLossPage.tsx` and verify the `ProfitLoss` interface. The backend `ProfitLossDto` already has `cogs` — verify the frontend type matches. If not, add the field.

- [ ] **Step 2: Commit if changes were needed**

```bash
git add frontend/src/views/smartpos/reports/ProfitLossPage.tsx
git commit -m "fix: ensure P&L page displays real COGS"
```

---

### Task 10: Verify end-to-end

- [ ] **Step 1: Build all backend services**

```bash
cd backend && for svc in inventory-service sales-service report-service; do
  echo "=== Building $svc ===" && mvn -pl $svc -am compile -q || break
done
```

- [ ] **Step 2: Verify frontend compiles**

```bash
cd frontend && npx tsc --noEmit 2>&1 | head -20
```

- [ ] **Step 3: Run existing tests**

```bash
cd backend && mvn -pl inventory-service,sales-service,report-service test -q 2>&1 | tail -10
```

- [ ] **Step 4: Commit any build/test fixes**

```bash
git add -A
git commit -m "chore: build and test fixes for WAC COGS implementation"
```
