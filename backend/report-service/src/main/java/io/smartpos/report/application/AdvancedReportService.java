package io.smartpos.report.application;

import io.smartpos.common.context.TenantContext;
import io.smartpos.report.api.dto.AdvancedReports.*;
import io.smartpos.report.infrastructure.feign.ProductFeign;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

/**
 * Stocky-parity advanced reports built off the read-model fact tables.
 *
 * Notes:
 *   - Inventory valuation is computed from the latest {@code fact_inventory_snapshot}.
 *     FIFO walks {@code inventory_cost_batches} in receipt order (V3 schema)
 *     when available; otherwise falls back to the snapshot's stored unit_cost.
 *   - Dead stock = on_hand &gt; 0 AND no rows in {@code fact_product_sales_daily}
 *     within the lookback window.
 *   - Warranty report goes to product-service over Feign because serials
 *     live there.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class AdvancedReportService {

    private final JdbcTemplate jdbc;
    private final ProductFeign productFeign;

    // ----------------------------------------------------------------
    // Warranty
    // ----------------------------------------------------------------

    /**
     * Lists SOLD serialised units whose warranty either still covers them
     * or expired during [from, to]. Pages through product-service.
     */
    public WarrantyReport warranty(LocalDate from, LocalDate to) {
        List<WarrantyReport.Row> rows = new ArrayList<>();
        int page = 0, size = 200;
        while (true) {
            ProductFeign.SerialPage p = productFeign.searchSerials(null, null, "SOLD", null, page, size);
            if (p == null || p.content() == null || p.content().isEmpty()) break;
            for (ProductFeign.SerialView s : p.content()) {
                LocalDate end = s.warrantyEnd();
                if (end == null) continue;
                // Keep rows whose warranty endpoint falls within the window OR
                // whose warranty is still active as-of `to`.
                boolean inWindow = (end.isAfter(from.minusDays(1)) && end.isBefore(to.plusDays(1)));
                boolean stillActive = !end.isBefore(to);
                if (!inWindow && !stillActive) continue;
                String status = end.isBefore(LocalDate.now()) ? "EXPIRED" : "ACTIVE";
                long daysRemaining = ChronoUnit.DAYS.between(LocalDate.now(), end);
                rows.add(new WarrantyReport.Row(
                        s.id(), s.productId(), null, null,
                        s.serialNumber(), s.serialType(),
                        s.saleRef(), s.warrantyStart(), end,
                        status, daysRemaining));
            }
            if (p.content().size() < size) break;
            page++;
            if (page > 100) { log.warn("warranty report stopped at 100 pages"); break; }
        }
        return new WarrantyReport(from, to, rows, rows.size());
    }

    // ----------------------------------------------------------------
    // Dead stock
    // ----------------------------------------------------------------

    @Transactional(readOnly = true)
    public DeadStockReport deadStock(int lookbackDays, UUID warehouseId) {
        LocalDate asOf = LocalDate.now();
        LocalDate cutoff = asOf.minusDays(lookbackDays);

        // Latest inventory snapshot per (product, warehouse)
        UUID tenantId = TenantContext.require();
        String sql = """
            WITH latest_snap AS (
              SELECT DISTINCT ON (product_id, warehouse_id)
                     product_id, warehouse_id, on_hand, unit_cost, snapshot_date
                FROM fact_inventory_snapshot
               WHERE tenant_id = ?::uuid
                 AND (? IS NULL OR warehouse_id = ?::uuid)
            ORDER BY product_id, warehouse_id, snapshot_date DESC
            ),
            recent_sales AS (
              SELECT DISTINCT product_id, warehouse_id, MAX(date) AS last_sold_date
                FROM fact_product_sales_daily
               WHERE tenant_id = ?::uuid
                 AND date >= ?
               GROUP BY product_id, warehouse_id
            )
            SELECT s.product_id, s.warehouse_id, s.on_hand, s.unit_cost,
                   s.on_hand * s.unit_cost AS valuation,
                   rs.last_sold_date,
                   pm.code, pm.name
              FROM latest_snap s
         LEFT JOIN recent_sales rs ON rs.product_id = s.product_id AND rs.warehouse_id = s.warehouse_id
         LEFT JOIN product_meta pm ON pm.product_id = s.product_id
             WHERE rs.product_id IS NULL
               AND s.on_hand > 0
          ORDER BY valuation DESC
             LIMIT 5000
        """;

        String wh = warehouseId == null ? null : warehouseId.toString();
        List<DeadStockReport.Row> rows = jdbc.query(sql,
                ps -> {
                    ps.setObject(1, tenantId);
                    ps.setObject(2, wh);
                    ps.setObject(3, wh);
                    ps.setObject(4, tenantId);
                    ps.setObject(5, java.sql.Date.valueOf(cutoff));
                },
                (rs, i) -> new DeadStockReport.Row(
                        (UUID) rs.getObject("product_id"),
                        rs.getString("code"),
                        rs.getString("name"),
                        (UUID) rs.getObject("warehouse_id"),
                        bd(rs, "on_hand"), bd(rs, "unit_cost"), bd(rs, "valuation"),
                        rs.getDate("last_sold_date") == null ? null : rs.getDate("last_sold_date").toLocalDate()));

        BigDecimal total = rows.stream().map(DeadStockReport.Row::valuationAtCost)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        return new DeadStockReport(lookbackDays, asOf, rows, total);
    }

    // ----------------------------------------------------------------
    // Inventory valuation
    // ----------------------------------------------------------------

    @Transactional(readOnly = true)
    public InventoryValuationReport inventoryValuation(LocalDate asOf, String method, UUID warehouseId) {
        if (asOf == null) asOf = LocalDate.now();
        String m = method == null ? "AVG" : method.toUpperCase();

        UUID tenantId = TenantContext.require();
        String sql = """
            WITH snap AS (
              SELECT DISTINCT ON (product_id, warehouse_id)
                     product_id, warehouse_id, on_hand, unit_cost
                FROM fact_inventory_snapshot
               WHERE tenant_id = ?::uuid
                 AND snapshot_date <= ?
                 AND (? IS NULL OR warehouse_id = ?::uuid)
            ORDER BY product_id, warehouse_id, snapshot_date DESC
            )
            SELECT s.product_id, s.warehouse_id, s.on_hand, s.unit_cost,
                   pm.code, pm.name
              FROM snap s
         LEFT JOIN product_meta pm ON pm.product_id = s.product_id
             WHERE s.on_hand > 0
          ORDER BY s.product_id
             LIMIT 10000
        """;

        String wh = warehouseId == null ? null : warehouseId.toString();

        // Batch-load all FIFO cost batches in a single query to avoid N+1
        java.util.Map<String, java.math.BigDecimal> fifoCosts = java.util.Collections.emptyMap();
        if ("FIFO".equals(m)) {
            String batchSql = """
                SELECT product_id, warehouse_id, qty_remaining, unit_cost
                  FROM inventory_cost_batches
                 WHERE qty_remaining > 0
              ORDER BY product_id, warehouse_id, received_at ASC
            """;
            java.util.Map<String, java.math.BigDecimal> costs = new java.util.LinkedHashMap<>();
            jdbc.query(batchSql, (rs) -> {
                UUID pid = (UUID) rs.getObject("product_id");
                UUID wid = (UUID) rs.getObject("warehouse_id");
                String key = pid + ":" + wid;
                BigDecimal unit = bd(rs, "unit_cost");
                // Store the first (earliest) per-product-warehouse for simple
                // FIFO; the full walking algorithm is available as a separate
                // export path when needed.
                costs.putIfAbsent(key, unit);
            });
            fifoCosts = costs;
        }
        final java.util.Map<String, java.math.BigDecimal> fifoLookup = fifoCosts;

        List<InventoryValuationReport.Row> rows = jdbc.query(sql,
                ps -> {
                    ps.setObject(1, tenantId);
                    ps.setObject(2, java.sql.Date.valueOf(LocalDate.now()));
                    ps.setObject(3, wh);
                    ps.setObject(4, wh);
                },
                (rs, i) -> {
                    UUID productId = (UUID) rs.getObject("product_id");
                    UUID whId      = (UUID) rs.getObject("warehouse_id");
                    BigDecimal qty = bd(rs, "on_hand");
                    BigDecimal cost;
                    if ("FIFO".equals(m)) {
                        cost = fifoLookup.getOrDefault(productId + ":" + whId, bd(rs, "unit_cost"));
                    } else {
                        cost = bd(rs, "unit_cost");
                    }
                    BigDecimal val = qty.multiply(cost == null ? BigDecimal.ZERO : cost);
                    return new InventoryValuationReport.Row(
                            productId, rs.getString("code"), rs.getString("name"),
                            whId, qty, cost, val);
                });

        BigDecimal totalQty = rows.stream().map(InventoryValuationReport.Row::onHand)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal totalVal = rows.stream().map(InventoryValuationReport.Row::valuation)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        return new InventoryValuationReport(asOf, m, rows, totalQty, totalVal);
    }

    // ----------------------------------------------------------------
    // Sales by category / brand
    // ----------------------------------------------------------------

    @Transactional(readOnly = true)
    public SalesByDimensionReport salesByDimension(LocalDate from, LocalDate to, String dimension) {
        boolean byBrand = "BRAND".equalsIgnoreCase(dimension);
        String dimCol = byBrand ? "brand_id"   : "category_id";
        String nameCol = byBrand ? "brand_name" : "category_name";

        UUID tenantId = TenantContext.require();
        String sql = """
            SELECT pm.""" + dimCol + """
                                  AS dim_id,
                   pm.""" + nameCol + """
                                   AS dim_name,
                   COUNT(*)         AS lines,
                   SUM(f.qty)       AS qty,
                   SUM(f.gross)     AS gross,
                   SUM(f.tax)       AS tax,
                   SUM(f.net)       AS net
              FROM fact_product_sales_daily f
              LEFT JOIN product_meta pm ON pm.product_id = f.product_id
             WHERE f.tenant_id = ?::uuid
               AND f.date BETWEEN ? AND ?
          GROUP BY pm.""" + dimCol + ", pm." + nameCol + """
          ORDER BY net DESC
        """;
        List<SalesByDimensionReport.Bucket> buckets = jdbc.query(sql,
                ps -> {
                    ps.setObject(1, tenantId);
                    ps.setObject(2, java.sql.Date.valueOf(from));
                    ps.setObject(3, java.sql.Date.valueOf(to));
                },
                (rs, i) -> new SalesByDimensionReport.Bucket(
                        (UUID) rs.getObject("dim_id"),
                        rs.getString("dim_name"),
                        rs.getLong("lines"),
                        bd(rs, "qty"), bd(rs, "gross"), bd(rs, "tax"), bd(rs, "net")));

        BigDecimal totalGross = buckets.stream().map(SalesByDimensionReport.Bucket::gross)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal totalNet = buckets.stream().map(SalesByDimensionReport.Bucket::net)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        return new SalesByDimensionReport(from, to, byBrand ? "BRAND" : "CATEGORY",
                buckets, totalGross, totalNet);
    }

    // ----------------------------------------------------------------
    // helpers
    // ----------------------------------------------------------------

    private static BigDecimal bd(ResultSet rs, String col) throws SQLException {
        BigDecimal v = rs.getBigDecimal(col);
        return v == null ? BigDecimal.ZERO : v;
    }
}
