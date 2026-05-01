package io.smartpos.report.api.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

/**
 * Output DTOs for the V3 advanced reports. Each report is a flat list +
 * an optional totals block — easy to bind to tables and to export to PDF/XLSX
 * via the existing ExportService machinery.
 */
public final class AdvancedReports {

    private AdvancedReports() {}

    /** Warranty report — lists serial-tracked items sold within a window
     *  whose warranty is still active or has expired in that window. */
    public record WarrantyReport(LocalDate from, LocalDate to,
                                 List<Row> rows, int total) {
        public record Row(
                UUID serialId, UUID productId, String productCode, String productName,
                String serialNumber, String serialType,
                String saleRef, LocalDate warrantyStart, LocalDate warrantyEnd,
                String status,                            // ACTIVE | EXPIRED
                long daysRemaining) {}
    }

    /** Dead stock — products with on_hand > 0 but no sales in the lookback window. */
    public record DeadStockReport(int lookbackDays, LocalDate asOf,
                                  List<Row> rows,
                                  BigDecimal totalValueAtCost) {
        public record Row(
                UUID productId, String productCode, String productName,
                UUID warehouseId,
                BigDecimal onHand, BigDecimal unitCost, BigDecimal valuationAtCost,
                LocalDate lastSoldDate) {}
    }

    /** Inventory valuation snapshot at a point in time, by chosen cost method. */
    public record InventoryValuationReport(LocalDate asOf, String method, // FIFO | AVG | LATEST
                                           List<Row> rows,
                                           BigDecimal totalQty,
                                           BigDecimal totalValuation) {
        public record Row(
                UUID productId, String productCode, String productName,
                UUID warehouseId,
                BigDecimal onHand, BigDecimal unitCost, BigDecimal valuation) {}
    }

    /** Sales by category / brand. Driver dimension is configurable. */
    public record SalesByDimensionReport(LocalDate from, LocalDate to, String dimension,
                                         List<Bucket> buckets,
                                         BigDecimal totalGross, BigDecimal totalNet) {
        public record Bucket(UUID dimensionId, String dimensionName,
                             long lines, BigDecimal qty,
                             BigDecimal gross, BigDecimal tax, BigDecimal net) {}
    }
}
