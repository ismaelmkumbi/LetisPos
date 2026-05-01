package io.smartpos.report.application;

import io.smartpos.report.infrastructure.feign.InventoryFeign;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

/**
 * Nightly job that materialises {@code fact_inventory_snapshot}.
 *
 * <p>Pulls every warehouse from Inventory, walks the paginated
 * {@code /stock/levels} endpoint, and upserts one row per (date, product,
 * warehouse) tuple. The schema's UNIQUE constraint means re-running the job
 * the same day is a free no-op (DO UPDATE).
 *
 * <p>Cost basis isn't currently exposed by the Inventory service — for now we
 * emit zero {@code unit_cost} / {@code valuation}. When Inventory grows a
 * weighted-average-cost projection (planned), wire those fields in here.
 *
 * <p>Cron: configurable via {@code smartpos.report.inventory-snapshot.cron}
 * (default 01:30 UTC). The job runs unauthenticated against Inventory — we'll
 * need a service-token wiring before this can run in a multi-tenant env.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class InventorySnapshotJob {

    private final InventoryFeign       inventory;
    private final FactProjectionService projections;

    @Scheduled(cron = "${smartpos.report.inventory-snapshot.cron:0 30 1 * * *}", zone = "UTC")
    public void runSnapshot() {
        LocalDate today = LocalDate.now();
        log.info("Starting inventory snapshot for {}", today);

        List<InventoryFeign.WarehouseRef> warehouses;
        try {
            warehouses = inventory.warehouses();
        } catch (Exception e) {
            log.error("Snapshot aborted — could not list warehouses: {}", e.getMessage());
            return;
        }

        int totalWarehouses = 0, totalRows = 0;
        for (InventoryFeign.WarehouseRef w : warehouses) {
            int rows = snapshotWarehouse(today, w.id());
            totalRows += rows;
            totalWarehouses++;
        }

        log.info("Inventory snapshot complete: {} row(s) across {} warehouse(s)",
                totalRows, totalWarehouses);
    }

    /** Returns row count snapshot'd for the warehouse. */
    private int snapshotWarehouse(LocalDate date, java.util.UUID warehouseId) {
        int page = 0, total = 0;
        while (true) {
            InventoryFeign.StockLevelPage p;
            try {
                p = inventory.levels(warehouseId, page, 200);
            } catch (Exception e) {
                log.warn("Snapshot page {} failed for warehouse {}: {}", page, warehouseId, e.getMessage());
                break;
            }
            if (p.content() == null || p.content().isEmpty()) break;
            for (InventoryFeign.StockLevel s : p.content()) {
                projections.applyInventorySnapshot(
                        date,
                        s.productId(),
                        s.warehouseId(),
                        null,                // tenantId — Inventory doesn't expose this on the wire yet
                        nz(s.onHand()),
                        BigDecimal.ZERO,     // unit_cost — placeholder until WAC projection lands
                        BigDecimal.ZERO      // valuation — placeholder
                );
                total++;
            }
            if (p.content().size() < p.size()) break;   // last page
            page++;
        }
        return total;
    }

    private static BigDecimal nz(BigDecimal v) { return v == null ? BigDecimal.ZERO : v; }
}
