package io.smartpos.inventory.api.dto;

import io.smartpos.inventory.domain.model.StockLevel;

import java.math.BigDecimal;
import java.util.UUID;

public record StockCostDto(
        UUID productId,
        UUID variantId,
        BigDecimal weightedAvgCost
) {
    public static StockCostDto from(StockLevel s) {
        return new StockCostDto(s.getProductId(), s.getVariantId(), s.getWeightedAvgCost());
    }
}
