package io.smartpos.ai.api.dto;

import jakarta.validation.constraints.NotBlank;

import java.time.Instant;
import java.util.List;

public final class ReportAiDtos {

    private ReportAiDtos() {}

    public record AnomalyRequest(
            @NotBlank String reportKind,
            @NotBlank String factsJson
    ) {}

    public record AnomalyResponse(
            List<Anomaly> anomalies,
            String provider,
            String model,
            Instant generatedAt
    ) {
        public record Anomaly(
                String metric,
                String description,
                String severity,
                String expectedRange,
                String actualValue
        ) {}
    }

    public record RecommendationRequest(
            @NotBlank String reportKind,
            @NotBlank String factsJson
    ) {}

    public record RecommendationResponse(
            List<Recommendation> recommendations,
            String provider,
            String model,
            Instant generatedAt
    ) {
        public record Recommendation(
                String title,
                String description,
                String category,
                String priority
        ) {}
    }
}
