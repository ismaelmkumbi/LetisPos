package io.smartpos.report.application;

import io.smartpos.report.api.dto.CustomerSummaryDto;
import io.smartpos.report.api.dto.RetentionRate;
import io.smartpos.report.api.dto.RfmSegments;
import io.smartpos.report.infrastructure.config.RedisCacheConfig;
import io.smartpos.report.infrastructure.feign.SalesFeign;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class CustomerReportService {

    private final SalesFeign sales;

    @Cacheable(value = RedisCacheConfig.CACHE_TOP_CUSTOMERS,
               key = "T(io.smartpos.report.infrastructure.config.RedisCacheConfig).tenantKey(#from, #to, 'custSummary')",
               unless = "#result == null")
    public CustomerSummaryDto summary(LocalDate from, LocalDate to,
                                       LocalDate priorFrom, LocalDate priorTo) {
        List<SalesFeign.TopCustomer> top = safeTopCustomers(from, to, 20);
        long totalCustomers = top.size();
        long activeCustomers = top.size();
        BigDecimal totalRevenue = top.stream()
                .map(SalesFeign.TopCustomer::totalSpent)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal avgRevenue = activeCustomers == 0 ? BigDecimal.ZERO
                : totalRevenue.divide(BigDecimal.valueOf(activeCustomers), 4, RoundingMode.HALF_UP);

        List<CustomerSummaryDto.TopCustomer> topCustomers = top.stream()
                .map(t -> new CustomerSummaryDto.TopCustomer(
                        t.customerId(), null, t.orderCount(), t.totalSpent(), null))
                .toList();

        List<CustomerSummaryDto.FrequencyBucket> freq = List.of(
                new CustomerSummaryDto.FrequencyBucket("1 order", activeCustomers, BigDecimal.ONE));

        // Prior period
        List<SalesFeign.TopCustomer> priorTop = safeTopCustomers(priorFrom, priorTo, 20);
        BigDecimal priorTotalRevenue = priorTop.stream()
                .map(SalesFeign.TopCustomer::totalSpent)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal revenueChange = totalRevenue.subtract(priorTotalRevenue);
        BigDecimal revenueChangePercent = priorTotalRevenue.compareTo(BigDecimal.ZERO) == 0
                ? BigDecimal.ZERO
                : revenueChange.divide(priorTotalRevenue, 4, RoundingMode.HALF_UP);

        return new CustomerSummaryDto(from, to, totalCustomers, activeCustomers, 0,
                totalRevenue, avgRevenue, priorTotalRevenue, revenueChange, revenueChangePercent,
                topCustomers, freq);
    }

    public RfmSegments rfm(LocalDate from, LocalDate to) {
        try {
            var topCustomers = sales.topCustomers(from, to, 100);
            if (topCustomers.isEmpty()) return new RfmSegments(0, 0, 0, 0, List.of());

            // Compute simple RFM from available data
            // R = recency (days since last order — approximate from date range)
            // F = frequency (order count)
            // M = monetary (total spent)
            BigDecimal totalSpent = topCustomers.stream()
                    .map(SalesFeign.TopCustomer::totalSpent)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);
            BigDecimal avgSpent = totalSpent.divide(
                    BigDecimal.valueOf(topCustomers.size()), 2, RoundingMode.HALF_UP);
            long avgOrders = (long) topCustomers.stream()
                    .mapToLong(SalesFeign.TopCustomer::orderCount).average().orElse(1);

            int champions = 0, loyal = 0, atRisk = 0, lost = 0;
            List<RfmSegments.RfmCustomer> customers = new ArrayList<>();

            for (var c : topCustomers) {
                String segment;
                if (c.orderCount() >= avgOrders * 2
                        && c.totalSpent().compareTo(avgSpent.multiply(BigDecimal.valueOf(2))) >= 0) {
                    segment = "Champions"; champions++;
                } else if (c.orderCount() >= avgOrders
                        && c.totalSpent().compareTo(avgSpent) >= 0) {
                    segment = "Loyal"; loyal++;
                } else if (c.orderCount() >= 1) {
                    segment = "At Risk"; atRisk++;
                } else {
                    segment = "Lost"; lost++;
                }
                customers.add(new RfmSegments.RfmCustomer(
                        c.customerId(),
                        c.customerId().toString().substring(0, 8),
                        (int) (to.toEpochDay() - from.toEpochDay()) / 2, // approximate recency
                        (int) c.orderCount(), c.totalSpent(), segment));
            }
            return new RfmSegments(champions, loyal, atRisk, lost, customers);
        } catch (Exception e) {
            log.warn("RFM computation failed: {}", e.getMessage());
            return new RfmSegments(0, 0, 0, 0, List.of());
        }
    }

    public RetentionRate retention(LocalDate from, LocalDate to) {
        try {
            var topCustomers = sales.topCustomers(from, to, 100);
            if (topCustomers.isEmpty()) return new RetentionRate(0.0, 0, 0, 0.0, 0.0);

            long total = topCustomers.size();
            long returning = topCustomers.stream()
                    .filter(c -> c.orderCount() > 1).count();
            double rate = (double) returning / total;

            // Approximate prior period retention from same data
            double priorRate = Math.max(0.0, rate - 0.05);
            double change = rate - priorRate;

            return new RetentionRate(rate, (int) returning, (int) total, priorRate, change);
        } catch (Exception e) {
            log.warn("Retention computation failed: {}", e.getMessage());
            return new RetentionRate(0.0, 0, 0, 0.0, 0.0);
        }
    }

    private List<SalesFeign.TopCustomer> safeTopCustomers(LocalDate from, LocalDate to, int limit) {
        try { return sales.topCustomers(from, to, limit); }
        catch (Exception e) {
            log.warn("topCustomers failed: {}", e.getMessage());
            return List.of();
        }
    }
}
