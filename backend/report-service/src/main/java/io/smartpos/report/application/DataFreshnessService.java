package io.smartpos.report.application;

import io.smartpos.report.api.dto.UnifiedResponse;
import io.smartpos.report.api.dto.UnifiedResponse.*;
import io.smartpos.report.domain.model.DataFreshness;
import io.smartpos.report.domain.repository.DataFreshnessRepository;
import io.smartpos.report.infrastructure.feign.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class DataFreshnessService {

    private final DataFreshnessRepository repo;
    private final SalesFeign sales;
    private final InventoryFeign inventory;
    private final PaymentFeign payments;

    private static final String FRESH = "FRESH";
    private static final String STALE = "STALE";
    private static final String ERROR = "ERROR";

    /**
     * Polls source services every 15 minutes and updates the
     * dashboard_data_freshness table. Uses lightweight queries to
     * avoid putting load on downstream services.
     */
    @Scheduled(fixedRateString = "${smartpos.report.freshness.interval-ms:900000}")
    public void refreshFreshness() {
        log.debug("Running data freshness poll");
        check("sales",      () -> sales.salesStats(null, null, null, null));
        check("inventory",  () -> inventory.summary(null));
        check("payments",   () -> payments.paymentStats(null, null, null));
        check("purchases",  () -> sales.purchaseStats(null, null, null));
        check("customers",  () -> sales.topCustomers(null, null, 1));
    }

    @FunctionalInterface
    private interface CheckAction {
        void run() throws Exception;
    }

    private void check(String source, CheckAction action) {
        DataFreshness df = repo.findById(source).orElseGet(() ->
            DataFreshness.builder().source(source).build());
        df.setCheckedAt(Instant.now());
        try {
            action.run();
            df.setLastUpdatedAt(Instant.now());
            df.setStatus(FRESH);
            df.setErrorMessage(null);
            log.debug("Freshness check OK for {}", source);
        } catch (Exception e) {
            df.setStatus(ERROR);
            df.setErrorMessage(truncate(e.getMessage()));
            log.warn("Freshness check FAILED for {}: {}", source, e.getMessage());
        }
        repo.save(df);
    }

    /** Build the DataFreshnessMap for the unified response envelope. */
    public DataFreshnessMap currentFreshness() {
        Map<String, DataFreshness> map = repo.findAllByOrderBySourceAsc()
            .stream().collect(Collectors.toMap(DataFreshness::getSource, d -> d));

        return new DataFreshnessMap(
            entry(map.get("sales")),
            entry(map.get("inventory")),
            entry(map.get("payments")),
            entry(map.get("purchases")),
            entry(map.get("customers"))
        );
    }

    /** Build the alerts list from freshness statuses.
     *  STALE if more than 15 minutes since last check, ERROR if the last check failed. */
    public List<Alert> buildAlerts(DataFreshnessMap fm) {
        List<FreshnessEntry> entries = List.of(
            fm.sales(), fm.inventory(), fm.payments(), fm.purchases(), fm.customers());
        return entries.stream()
            .filter(e -> STALE.equals(e.status()) || ERROR.equals(e.status()))
            .map(e -> {
                String level = ERROR.equals(e.status()) ? "error" : "warning";
                String msg = ERROR.equals(e.status())
                    ? "Data source is unreachable: " + (e.errorMessage() != null ? e.errorMessage() : "unknown error")
                    : "Data is stale (last updated: " + e.lastUpdated() + ")";
                return new Alert(level, msg);
            })
            .toList();
    }

    private static FreshnessEntry entry(DataFreshness d) {
        if (d == null) {
            return new FreshnessEntry(Instant.EPOCH, STALE, "Not yet checked");
        }
        // Mark as STALE if checked more than 15 minutes ago, even if status says FRESH
        long minutesSinceCheck = ChronoUnit.MINUTES.between(d.getCheckedAt(), Instant.now());
        String effectiveStatus = d.getStatus();
        if (FRESH.equals(effectiveStatus) && minutesSinceCheck > 15) {
            effectiveStatus = STALE;
        }
        return new FreshnessEntry(d.getLastUpdatedAt(), effectiveStatus, d.getErrorMessage());
    }

    private static String truncate(String s) {
        if (s == null || s.isBlank()) return "(no detail)";
        return s.length() > 200 ? s.substring(0, 200) + "..." : s;
    }
}
