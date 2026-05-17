package io.smartpos.report.api.dto;

import java.util.List;
import java.util.UUID;

public record ReorderRecommendationDto(List<ReorderEntry> recommendations) {
    public record ReorderEntry(
        UUID productId, String productName, int currentStock,
        int minQty, int suggestedQty, double dailyVelocity,
        String urgency, String expectedShortageDate
    ) {}
}
