package io.smartpos.report.api.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public record CustomerSummaryDto(
        LocalDate from, LocalDate to,
        long totalCustomers,
        long activeCustomers,
        long newCustomers,
        BigDecimal totalRevenue,
        BigDecimal avgRevenuePerCustomer,
        BigDecimal priorTotalRevenue,
        BigDecimal revenueChange,
        BigDecimal revenueChangePercent,
        List<TopCustomer> topCustomers,
        List<FrequencyBucket> frequencyDistribution
) {
    public record TopCustomer(UUID customerId, String customerName, long orderCount, BigDecimal totalSpent, LocalDate lastPurchase) {}
    public record FrequencyBucket(String label, long customerCount, BigDecimal revenueShare) {}
}
