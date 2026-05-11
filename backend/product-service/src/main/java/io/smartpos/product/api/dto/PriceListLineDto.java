package io.smartpos.product.api.dto;

import io.smartpos.product.domain.model.PriceListLine;

import java.math.BigDecimal;
import java.util.UUID;

public record PriceListLineDto(
        UUID id,
        UUID productId,
        UUID variantId,
        BigDecimal price,
        BigDecimal minQty,
        BigDecimal maxQty
) {
    public static PriceListLineDto from(PriceListLine line) {
        return new PriceListLineDto(
                line.getId(), line.getProductId(), line.getVariantId(),
                line.getPrice(), line.getMinQty(), line.getMaxQty());
    }
}
