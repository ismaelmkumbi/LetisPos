package io.smartpos.report.application;

import io.smartpos.report.api.dto.CustomerSummaryDto;
import io.smartpos.report.infrastructure.config.RedisCacheConfig;
import io.smartpos.report.infrastructure.feign.SalesFeign;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
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
    public CustomerSummaryDto summary(LocalDate from, LocalDate to) {
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

        return new CustomerSummaryDto(from, to, totalCustomers, activeCustomers, 0,
                totalRevenue, avgRevenue, topCustomers, freq);
    }

    private List<SalesFeign.TopCustomer> safeTopCustomers(LocalDate from, LocalDate to, int limit) {
        try { return sales.topCustomers(from, to, limit); }
        catch (Exception e) {
            log.warn("topCustomers failed: {}", e.getMessage());
            return List.of();
        }
    }
}
