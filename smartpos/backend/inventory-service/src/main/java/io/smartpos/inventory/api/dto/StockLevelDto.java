package io.smartpos.inventory.api.dto;

import io.smartpos.inventory.domain.model.StockLevel;

import java.math.BigDecimal;
import java.util.UUID;

public record StockLevelDto(
        UUID id,
        UUID productId,
        UUID variantId,
        UUID warehouseId,
        BigDecimal onHand,
        BigDecimal reserved,
        BigDecimal available,
        int stockAlertThreshold,
        long version
) {
    public static StockLevelDto from(StockLevel s) {
        return new StockLevelDto(
                s.getId(), s.getProductId(), s.getVariantId(), s.getWarehouseId(),
                s.getOnHand(), s.getReserved(), s.available(),
                s.getStockAlertThreshold(), s.getVersion()
        );
    }
}
