package io.smartpos.report.api.dto;

import java.time.Instant;
import java.util.List;

public record UnifiedResponse<T>(
    String status,           // "ok" | "degraded" | "error"
    T data,
    ResponseMeta meta
) {
    public record ResponseMeta(
        Instant generatedAt,
        DataFreshnessMap dataFreshness,
        List<Alert> alerts
    ) {}

    public record Alert(String level, String message) {}

    public record DataFreshnessMap(
        FreshnessEntry sales,
        FreshnessEntry inventory,
        FreshnessEntry payments,
        FreshnessEntry purchases,
        FreshnessEntry customers
    ) {}

    public record FreshnessEntry(
        Instant lastUpdated,
        String status,        // FRESH | STALE | ERROR
        String errorMessage   // null when status != ERROR
    ) {}

    // Factory methods
    public static <T> UnifiedResponse<T> ok(T data, ResponseMeta meta) {
        return new UnifiedResponse<>("ok", data, meta);
    }

    public static <T> UnifiedResponse<T> degraded(T data, ResponseMeta meta) {
        return new UnifiedResponse<>("degraded", data, meta);
    }

    public static <T> UnifiedResponse<T> error(String message) {
        return new UnifiedResponse<>("error", null,
            new ResponseMeta(Instant.now(), null,
                List.of(new Alert("error", message))));
    }
}
