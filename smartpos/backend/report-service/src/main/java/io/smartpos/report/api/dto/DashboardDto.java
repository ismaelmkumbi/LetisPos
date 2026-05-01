package io.smartpos.report.api.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

public record DashboardDto(
        LocalDate from,
        LocalDate to,
        Sales sales,
        Purchases purchases,
        Payments payments,
        Expenses expenses,
        Inventory inventory,
        List<SeriesPoint> salesSeries,
        List<TopProduct> topProducts,
        BigDecimal netProfit         // sales.net - expenses.total - purchases.net(cost)
) {
    public record Sales(long count, BigDecimal gross, BigDecimal tax,
                        BigDecimal discount, BigDecimal net,
                        BigDecimal paid, BigDecimal due) {}
    public record Purchases(long count, BigDecimal gross, BigDecimal paid, BigDecimal due) {}
    public record Payments(long count, BigDecimal totalIn, BigDecimal totalOut) {}
    public record Expenses(BigDecimal total, long count) {}
    public record Inventory(long distinctProducts, BigDecimal totalOnHand,
                            BigDecimal totalAvailable, long lowStockLines) {}
    public record SeriesPoint(LocalDate date, BigDecimal net, long count) {}
    public record TopProduct(String productId, String name, BigDecimal qty, BigDecimal revenue) {}
}
