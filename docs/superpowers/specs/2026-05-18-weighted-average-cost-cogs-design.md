# Weighted Average Cost COGS

**Date:** 2026-05-18  
**Status:** design

## Problem

The dashboard Business Pulse card and P&L report calculate COGS as `purchases.gross` — treating all purchases as an immediate cost in the period they were bought. This is incorrect:

- A retailer who buys 100 TVs for TSh 2,430,000 but sells 1 for TSh 10,000 sees a "loss" of −TSh 2,420,000
- The 99 unsold TVs are still inventory (assets), not costs
- The Business Pulse card shows Revenue, Expenses, and Margin as supporting stats but hides COGS, so the math doesn't visibly add up

## Root cause

The `sale_lines` table has no `unit_cost` column. The system never captures what a sold item actually cost at the time of sale. Without that, COGS can only be approximated as all purchases in the period.

## Solution

Implement weighted average cost (WAC) tracking per product per warehouse. Capture the WAC as `unit_cost` on each sale line at sale time. Use `SUM(sale_lines.unit_cost × qty)` as COGS in reports.

### Database migrations

**`stock_levels` table:**
```sql
ALTER TABLE stock_levels ADD COLUMN weighted_avg_cost DECIMAL(19,4) NOT NULL DEFAULT 0;
```

**`sale_lines` table:**
```sql
ALTER TABLE sale_lines ADD COLUMN unit_cost DECIMAL(19,4) NOT NULL DEFAULT 0;
```

### Inventory Service

**`StockLevel.java`** — add field:
```java
@Column(name = "weighted_avg_cost", nullable = false)
private BigDecimal weightedAvgCost = BigDecimal.ZERO;
```

Add WAC recalculation method:
```java
/**
 * Recalculate weighted average cost when new stock is received.
 * newWAC = (currentOnHand × currentWAC + receivedQty × receivedUnitCost) / (currentOnHand + receivedQty)
 */
public void recalculateWac(BigDecimal receivedQty, BigDecimal receivedUnitCost) {
    BigDecimal currentValue = this.onHand.multiply(this.weightedAvgCost);
    BigDecimal receivedValue = receivedQty.multiply(receivedUnitCost);
    BigDecimal totalQty = this.onHand.add(receivedQty);
    if (totalQty.compareTo(BigDecimal.ZERO) > 0) {
        this.weightedAvgCost = currentValue.add(receivedValue).divide(totalQty, 4, RoundingMode.HALF_UP);
    }
}
```

Trigger recalculation in the inventory service's adjustment handler when the adjustment type is `PURCHASE_IN`. Call `recalculateWac(receivedQty, receivedUnitCost)` **before** `applyDelta(receivedQty)` — the WAC formula uses current `onHand` (pre-receipt), not post-receipt onHand.

**New Feign endpoint** — expose WAC to the sales service:
```
GET /api/v1/stock/costs?warehouseId=<uuid>&productIds=<csv>
Response: [{ productId: UUID, variantId: UUID | null, weightedAvgCost: number }]
```

Alternatively, extend the existing reservation flow to return cost alongside the reservation response.

### Sales Service

**`SaleLine.java`** — add field:
```java
@Column(name = "unit_cost", nullable = false)
private BigDecimal unitCost = BigDecimal.ZERO;
```

**`SaleService.create()`** — after constructing sale lines but before persisting, fetch current WAC for each product from inventory service and snapshot it as `unitCost` on each `SaleLine`. This is a read-before-write — the sale captures the cost that was current at the moment of sale.

**DTO updates:**
- `SaleDto.SaleLine` — add `unitCost: number`
- `SaleLineInput` — no change needed (unitCost is not input, it's fetched by the backend)

### Report Service

**`DashboardService.dashboard()`** — change from:
```java
BigDecimal cogs = nz(p.gross());  // OLD: purchases as COGS
```
to:
```java
BigDecimal cogs = sales.costOfGoodsSold(from, to, warehouseId, null);  // NEW: sum of sale_line costs
```

Add a Feign method on `SalesFeign`:
```java
@GetMapping("/api/v1/sales/cogs")
BigDecimal costOfGoodsSold(@RequestParam LocalDate from, @RequestParam LocalDate to,
                           @RequestParam UUID warehouseId, @RequestParam UUID customerId);
```

**`ProfitLossService.profitLoss()`** — same change.

### Frontend

**`BusinessPulseCard.tsx`** — add COGS as a fourth supporting stat:

| Revenue | COGS | Expenses | Margin |
|---|---|---|---|

COGS value comes from `data.cogs` (new field on `DashboardDto`), or computed from sales if we add the field to the DTO.

**`DashboardDto`** — add `cogs: BigDecimal` field.

**`Dashboard` TypeScript type** — add `cogs: number`.

### Data flow (end to end)

```
1. Purchase received → StockLevel.recalculateWac(qty, unitCost)  // uses current onHand
                     → StockLevel.applyDelta(qty)                  // then increments onHand

2. Sale created      → SaleService calls GET /stock/costs
                     → Snapshots unitCost on each SaleLine
                     → Sale persisted

3. Dashboard loaded  → DashboardService queries sales for COGS
                     → netProfit = sales.net - COGS(from sale_lines) - expenses.total
                     → BusinessPulseCard shows Revenue, COGS, Expenses, Margin
```

## Edge cases

- **Initial state**: WAC starts at 0. Receiving the first purchase sets the initial WAC to that purchase's unit cost.
- **Zero on-hand after sale**: WAC persists — it's historical. Next purchase recalibration uses `0 × wac + newQty × newCost / newQty`.
- **Returns**: Sale returns should reverse COGS using the original sale line's `unitCost` (snapshotted at sale time), not current WAC.
- **Purchase returns**: Recalculate WAC in reverse when returning goods to supplier.
- **Variant-level costing**: If variants have different costs, WAC is tracked at the variant level on `stock_levels`.

## Scope

This is a focused change — no refactoring of unrelated components, no new abstractions. The change adds one column to two tables and wires the flow through existing services.
