package io.smartpos.ai.application;

import io.smartpos.ai.api.dto.AiAnalyticsDtos;
import io.smartpos.ai.infrastructure.feign.SalesFeign;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.ZoneOffset;
import java.util.*;
import java.util.stream.Collectors;

/**
 * Rule-based fraud detection (no ML needed).
 *
 * Detection rules:
 * 1. High discount: line-level discount > 50% of unit_price * qty
 * 2. Rapid voids: > 3 CANCELLED sales by same user within 1 hour
 * 3. Refund without sale: RETURNED status sales
 * 4. Unusual hour: transactions between 02:00-05:00
 * 5. High value: single transaction grand_total > 10× average order value
 *
 * Each flag gets a risk score (0-100). Combined score = max of all triggering rules.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class FraudDetectionService {

    private final SalesFeign salesFeign;

    private static final int MAX_PAGES = 10;
    private static final int PAGE_SIZE = 1000;
    private static final int LOOKBACK_DAYS = 7;

    // Risk score weights
    private static final int RISK_HIGH_DISCOUNT = 80;
    private static final int RISK_RAPID_VOID = 90;
    private static final int RISK_REFUND = 70;
    private static final int RISK_UNUSUAL_HOUR = 65;
    private static final int RISK_HIGH_VALUE = 85;

    public List<AiAnalyticsDtos.FlaggedTransaction> detectFraud(UUID tenantId) {
        log.info("Running fraud detection for tenant={}", tenantId);

        LocalDate dateTo = LocalDate.now();
        LocalDate dateFrom = dateTo.minusDays(LOOKBACK_DAYS);

        // Fetch all sales (all statuses) for the lookback window
        List<SalesFeign.SaleSummary> allSales = fetchAllSales(dateFrom, dateTo);

        if (allSales.isEmpty()) {
            log.info("No transactions found for tenant={}, returning empty alerts", tenantId);
            return List.of();
        }

        // Compute average order value for High Value rule
        BigDecimal totalRevenue = allSales.stream()
                .filter(s -> "CONFIRMED".equals(s.status()))
                .map(SalesFeign.SaleSummary::grandTotal)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        long confirmedCount = allSales.stream()
                .filter(s -> "CONFIRMED".equals(s.status()))
                .count();
        BigDecimal avgOrderValue = confirmedCount > 0
                ? totalRevenue.divide(BigDecimal.valueOf(confirmedCount), 0, RoundingMode.HALF_UP)
                : BigDecimal.ZERO;
        BigDecimal highValueThreshold = avgOrderValue.multiply(BigDecimal.TEN);

        List<AiAnalyticsDtos.FlaggedTransaction> alerts = new ArrayList<>();

        // Partition by status
        List<SalesFeign.SaleSummary> confirmed = allSales.stream()
                .filter(s -> "CONFIRMED".equals(s.status())).toList();
        List<SalesFeign.SaleSummary> cancelled = allSales.stream()
                .filter(s -> "CANCELLED".equals(s.status())).toList();
        List<SalesFeign.SaleSummary> returned = allSales.stream()
                .filter(s -> "RETURNED".equals(s.status())).toList();

        // ── Rule 1: High discount ─────────────────────────────────────────
        for (SalesFeign.SaleSummary sale : confirmed) {
            if (sale.lines() == null) continue;
            List<String> discountReasons = new ArrayList<>();
            for (SalesFeign.SaleLineSummary line : sale.lines()) {
                BigDecimal lineTotal = line.unitPrice().multiply(line.qty());
                if (lineTotal.signum() > 0
                        && line.discount().compareTo(lineTotal.multiply(BigDecimal.valueOf(0.5))) > 0) {
                    discountReasons.add("Line " + line.productName() + " discount > 50%");
                }
            }
            if (!discountReasons.isEmpty()) {
                alerts.add(buildAlert(sale, "High Discount", RISK_HIGH_DISCOUNT, discountReasons));
            }
        }

        // ── Rule 2: Rapid voids ───────────────────────────────────────────
        Map<UUID, List<SalesFeign.SaleSummary>> voidsByUser = cancelled.stream()
                .filter(s -> s.userId() != null)
                .collect(Collectors.groupingBy(SalesFeign.SaleSummary::userId));

        for (Map.Entry<UUID, List<SalesFeign.SaleSummary>> entry : voidsByUser.entrySet()) {
            UUID userId = entry.getKey();
            List<SalesFeign.SaleSummary> userVoids = entry.getValue();
            // Sort by confirmedAt (when it was cancelled)
            List<SalesFeign.SaleSummary> sorted = userVoids.stream()
                    .sorted(Comparator.comparing(
                            s -> s.confirmedAt() != null ? s.confirmedAt() : Instant.EPOCH))
                    .toList();

            // Sliding window: check if > 3 voids within 1 hour
            for (int i = 0; i < sorted.size(); i++) {
                Instant windowStart = getInstant(sorted.get(i));
                if (windowStart == null) continue;
                Instant windowEnd = windowStart.plusSeconds(3600);
                int count = 0;
                for (int j = i; j < sorted.size(); j++) {
                    Instant check = getInstant(sorted.get(j));
                    if (check != null && !check.isBefore(windowStart) && !check.isAfter(windowEnd)) {
                        count++;
                    }
                }
                if (count > 3) {
                    alerts.add(buildAlert(sorted.get(i), "Rapid Voids", RISK_RAPID_VOID,
                            List.of("User " + userId + ": " + count + " voids in 1 hour")));
                    break; // flag once per user
                }
            }
        }

        // ── Rule 3: Refund without sale ───────────────────────────────────
        for (SalesFeign.SaleSummary sale : returned) {
            alerts.add(buildAlert(sale, "Refund Without Sale", RISK_REFUND,
                    List.of("Sale returned: " + (sale.ref() != null ? sale.ref() : sale.id()))));
        }

        // ── Rule 4: Unusual hour (02:00-05:00) ────────────────────────────
        for (SalesFeign.SaleSummary sale : confirmed) {
            if (sale.confirmedAt() != null) {
                LocalTime time = LocalTime.ofInstant(sale.confirmedAt(), ZoneOffset.UTC);
                if (time.isAfter(LocalTime.of(1, 59)) && time.isBefore(LocalTime.of(5, 1))) {
                    alerts.add(buildAlert(sale, "After Hours", RISK_UNUSUAL_HOUR,
                            List.of("Transaction at " + time)));
                }
            }
        }

        // ── Rule 5: High value ────────────────────────────────────────────
        if (avgOrderValue.signum() > 0) {
            for (SalesFeign.SaleSummary sale : confirmed) {
                if (sale.grandTotal().compareTo(highValueThreshold) > 0) {
                    String reason = String.format("TZS %,.0f > 10x avg (TZS %,.0f)",
                            sale.grandTotal(), avgOrderValue);
                    alerts.add(buildAlert(sale, "High Value", RISK_HIGH_VALUE, List.of(reason)));
                }
            }
        }

        // Deduplicate by transaction ID (a sale might trigger multiple rules)
        Map<String, AiAnalyticsDtos.FlaggedTransaction> deduped = new LinkedHashMap<>();
        for (AiAnalyticsDtos.FlaggedTransaction alert : alerts) {
            String key = alert.transactionId() + "|" + alert.type();
            if (deduped.containsKey(alert.transactionId())) {
                // Merge: keep the one with higher risk score
                AiAnalyticsDtos.FlaggedTransaction existing = deduped.get(alert.transactionId());
                if (alert.riskScore() > existing.riskScore()) {
                    deduped.put(alert.transactionId(),
                            new AiAnalyticsDtos.FlaggedTransaction(
                                    alert.transactionId(), alert.amount(),
                                    alert.type(), alert.riskScore(),
                                    alert.reasons(), alert.detectedAt(), alert.status()));
                }
            } else {
                deduped.put(alert.transactionId(), alert);
            }
        }

        // Sort by risk score descending
        List<AiAnalyticsDtos.FlaggedTransaction> result = new ArrayList<>(deduped.values());
        result.sort((a, b) -> Integer.compare(b.riskScore(), a.riskScore()));

        log.info("Fraud detection complete: {} flagged out of {} transactions", result.size(), allSales.size());
        return result;
    }

    // ── helpers ──────────────────────────────────────────────────────────────

    private List<SalesFeign.SaleSummary> fetchAllSales(LocalDate dateFrom, LocalDate dateTo) {
        List<SalesFeign.SaleSummary> all = new ArrayList<>();
        for (int page = 0; page < MAX_PAGES; page++) {
            try {
                // Fetch all statuses (null = no status filter)
                SalesFeign.SalePage result = salesFeign.search(
                        dateFrom, dateTo, null, null, null, null, page, PAGE_SIZE);
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

    private static AiAnalyticsDtos.FlaggedTransaction buildAlert(
            SalesFeign.SaleSummary sale, String type, int riskScore, List<String> reasons) {
        return new AiAnalyticsDtos.FlaggedTransaction(
                sale.ref() != null ? sale.ref() : sale.id().toString(),
                sale.grandTotal(),
                type,
                riskScore,
                reasons,
                sale.confirmedAt() != null ? sale.confirmedAt() : Instant.now(),
                "pending"
        );
    }

    private static Instant getInstant(SalesFeign.SaleSummary sale) {
        return sale.confirmedAt() != null ? sale.confirmedAt() : sale.createdAt();
    }
}
