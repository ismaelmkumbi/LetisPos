package io.smartpos.product.api.dto;

import io.smartpos.product.domain.model.ProductComboItem;

import java.math.BigDecimal;
import java.util.UUID;

public record ComboItemDto(
        UUID id,
        UUID componentProductId,
        BigDecimal qty,
        BigDecimal unitCost,
        BigDecimal unitPrice,
        int position
) {
    public static ComboItemDto from(ProductComboItem c) {
        return new ComboItemDto(
                c.getId(), c.getComponentProductId(), c.getQty(),
                c.getUnitCost(), c.getUnitPrice(), c.getPosition());
    }
}
