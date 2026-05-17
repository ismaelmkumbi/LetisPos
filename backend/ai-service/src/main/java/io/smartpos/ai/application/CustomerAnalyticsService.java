package io.smartpos.ai.application;

import io.smartpos.ai.api.dto.AiAnalyticsDtos;
import io.smartpos.ai.infrastructure.feign.SalesFeign;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.stream.Collectors;

/**
 * Customer Analytics using RFM (Recency, Frequency, Monetary) segmentation.
 *
 * Segments:
 * - Loyal:  R < 30 days, F > 10, M > median
 * - At Risk: R > 60 days, F > 3
 * - Lost:    R > 180 days
 * - New:     first purchase within 30 days
 * - Others:  everything else
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class CustomerAnalyticsService {

    private final SalesFeign salesFeign;

    private static final int MAX_PAGES = 30;
    private static final int PAGE_SIZE = 1000;

    public AiAnalyticsDtos.CustomerAnalyticsResponse analyze(UUID tenantId) {
        log.info("Running customer analytics for tenant={}", tenantId);

        LocalDate dateTo = LocalDate.now();
        LocalDate dateFrom = dateTo.minusDays(365); // look back one year

        List<SalesFeign.SaleSummary> allSales = fetchSales(dateFrom, dateTo);

        if (allSales.isEmpty()) {
            log.info("No sales data found for tenant={}, returning empty analytics", tenantId);
            return emptyResponse();
        }

        // Step 1: Group sales by customerId (skip null customers)
        Map<UUID, List<SalesFeign.SaleSummary>> byCustomer = allSales.stream()
                .filter(s -> s.customerId() != null)
                .collect(Collectors.groupingBy(SalesFeign.SaleSummary::customerId));

        if (byCustomer.isEmpty()) {
            return emptyResponse();
        }

        // Step 2: Compute RFM per customer
        List<RfmRecord> rfmRecords = new ArrayList<>();
        for (Map.Entry<UUID, List<SalesFeign.SaleSummary>> entry : byCustomer.entrySet()) {
            UUID customerId = entry.getKey();
            List<SalesFeign.SaleSummary> customerSales = entry.getValue();

            // Frequency
            int frequency = customerSales.size();

            // Monetary (total spent)
            BigDecimal monetary = customerSales.stream()
                    .map(SalesFeign.SaleSummary::grandTotal)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);

            // Recency — days since last purchase
            Optional<LocalDate> lastDate = customerSales.stream()
                    .map(SalesFeign.SaleSummary::date)
                    .max(LocalDate::compareTo);
            Optional<LocalDate> firstDate = customerSales.stream()
                    .map(SalesFeign.SaleSummary::date)
                    .min(LocalDate::compareTo);

            long recencyDays = lastDate.map(d -> ChronoUnit.DAYS.between(d, dateTo)).orElse(365L);
            long daysSinceFirst = firstDate.map(d -> ChronoUnit.DAYS.between(d, dateTo)).orElse(365L);

            rfmRecords.add(new RfmRecord(
                    customerId, recencyDays, frequency, monetary,
                    lastDate.orElse(dateTo), daysSinceFirst));
        }

        int totalCustomers = rfmRecords.size();

        // Step 3: Compute median monetary for segmentation
        List<BigDecimal> sortedMonetary = rfmRecords.stream()
                .map(RfmRecord::monetary)
                .sorted()
                .toList();
        BigDecimal medianMonetary;
        if (sortedMonetary.isEmpty()) {
            medianMonetary = BigDecimal.ZERO;
        } else {
            int mid = sortedMonetary.size() / 2;
            medianMonetary = sortedMonetary.size() % 2 == 0
                    ? sortedMonetary.get(mid - 1).add(sortedMonetary.get(mid))
                        .divide(BigDecimal.valueOf(2), RoundingMode.HALF_UP)
                    : sortedMonetary.get(mid);
        }

        // Step 4: Segment customers
        Map<String, List<RfmRecord>> segments = new LinkedHashMap<>();
        segments.put("Loyal", new ArrayList<>());
        segments.put("At Risk", new ArrayList<>());
        segments.put("Lost", new ArrayList<>());
        segments.put("New", new ArrayList<>());
        segments.put("Others", new ArrayList<>());

        for (RfmRecord rfm : rfmRecords) {
            if (rfm.recencyDays() < 30 && rfm.frequency() > 10
                    && rfm.monetary().compareTo(medianMonetary) > 0) {
                segments.get("Loyal").add(rfm);
            } else if (rfm.recencyDays() > 60 && rfm.frequency() > 3) {
                segments.get("At Risk").add(rfm);
            } else if (rfm.recencyDays() > 180) {
                segments.get("Lost").add(rfm);
            } else if (rfm.daysSinceFirst() < 30) {
                segments.get("New").add(rfm);
            } else {
                segments.get("Others").add(rfm);
            }
        }

        // Step 5: Build segment DTOs
        List<AiAnalyticsDtos.CustomerSegment> segmentDtos = new ArrayList<>();
        Map<String, String> segmentColors = Map.of(
                "Loyal", "#16a34a",
                "At Risk", "#f59e0b",
                "Lost", "#dc2626",
                "New", "#3b82f6",
                "Others", "#6b7280"
        );
        for (Map.Entry<String, List<RfmRecord>> seg : segments.entrySet()) {
            long count = seg.getValue().size();
            double pct = totalCustomers > 0 ? (count * 100.0 / totalCustomers) : 0;
            segmentDtos.add(new AiAnalyticsDtos.CustomerSegment(
                    seg.getKey(), count,
                    Math.round(pct * 10.0) / 10.0,
                    segmentColors.getOrDefault(seg.getKey(), "#6b7280")));
        }

        // Step 6: Top 10 customers by total spent (with churn probability)
        int maxFrequency = rfmRecords.stream()
                .mapToInt(RfmRecord::frequency)
                .max().orElse(1);

        List<AiAnalyticsDtos.TopCustomer> topCustomers = rfmRecords.stream()
                .sorted((a, b) -> b.monetary().compareTo(a.monetary()))
                .limit(10)
                .map(rfm -> {
                    String seg = determineSegment(rfm, medianMonetary);
                    double churnProbability = Math.min(1.0, Math.max(0.0,
                            (rfm.recencyDays() / 180.0) * 0.6
                                    + (1.0 - rfm.frequency() / Math.max(maxFrequency, 1.0)) * 0.4
                    ));
                    return new AiAnalyticsDtos.TopCustomer(
                            rfm.customerId(),
                            "Customer " + rfm.customerId().toString().substring(0, 8),
                            rfm.monetary(),
                            rfm.frequency(),
                            rfm.lastPurchase(),
                            seg,
                            Math.round(churnProbability * 1000.0) / 1000.0);
                })
                .collect(Collectors.toList());

        // Step 7: Aggregate metrics
        long repeatCustomers = rfmRecords.stream().filter(r -> r.frequency() > 1).count();
        double repeatRate = totalCustomers > 0
                ? Math.round((repeatCustomers * 100.0 / totalCustomers) * 10.0) / 10.0
                : 0;

        BigDecimal totalRevenue = rfmRecords.stream()
                .map(RfmRecord::monetary)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal avgOrderValue = totalCustomers > 0
                ? totalRevenue.divide(BigDecimal.valueOf(totalCustomers), 0, RoundingMode.HALF_UP)
                : BigDecimal.ZERO;

        long atRiskCount = segments.get("At Risk").size();
        long lostCount = segments.get("Lost").size();
        double churnRisk = totalCustomers > 0
                ? Math.round(((atRiskCount + lostCount) * 100.0 / totalCustomers) * 10.0) / 10.0
                : 0;

        log.info("Customer analytics complete: total={}, loyal={}, atRisk={}, lost={}, new={}, churnRisk={}%",
                totalCustomers, segments.get("Loyal").size(), atRiskCount,
                lostCount, segments.get("New").size(), churnRisk);

        return new AiAnalyticsDtos.CustomerAnalyticsResponse(
                totalCustomers, repeatRate, avgOrderValue, churnRisk, segmentDtos, topCustomers);
    }

    // ── helpers ──────────────────────────────────────────────────────────────

    private List<SalesFeign.SaleSummary> fetchSales(LocalDate dateFrom, LocalDate dateTo) {
        List<SalesFeign.SaleSummary> all = new ArrayList<>();
        for (int page = 0; page < MAX_PAGES; page++) {
            try {
                SalesFeign.SalePage result = salesFeign.search(
                        dateFrom, dateTo, null, null, "CONFIRMED", page, PAGE_SIZE);
                if (result == null || result.content() == null || result.content().isEmpty()) break;
                all.addAll(result.content());
                if (page + 1 >= result.totalPages()) break;
            } catch (Exception e) {
                log.warn("Failed to fetch sales page {}: {}", page, e.getMessage());
                break;
            }
        }
        return all;
    }

    private String determineSegment(RfmRecord rfm, BigDecimal medianMonetary) {
        if (rfm.recencyDays() < 30 && rfm.frequency() > 10
                && rfm.monetary().compareTo(medianMonetary) > 0) return "Loyal";
        if (rfm.recencyDays() > 180) return "Lost";
        if (rfm.recencyDays() > 60 && rfm.frequency() > 3) return "At Risk";
        if (rfm.daysSinceFirst() < 30) return "New";
        return "Others";
    }

    private static AiAnalyticsDtos.CustomerAnalyticsResponse emptyResponse() {
        return new AiAnalyticsDtos.CustomerAnalyticsResponse(
                0, 0, BigDecimal.ZERO, 0, List.of(), List.of());
    }

    private record RfmRecord(
            UUID customerId,
            long recencyDays,
            int frequency,
            BigDecimal monetary,
            LocalDate lastPurchase,
            long daysSinceFirst
    ) {}
}
