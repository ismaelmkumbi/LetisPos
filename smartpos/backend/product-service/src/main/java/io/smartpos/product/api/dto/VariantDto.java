package io.smartpos.product.api.dto;

import io.smartpos.product.domain.model.ProductVariant;

import java.math.BigDecimal;
import java.util.UUID;

public record VariantDto(
        UUID id,
        String name,
        String code,
        BigDecimal cost,
        BigDecimal price,
        BigDecimal wholesalePrice,
        BigDecimal minPrice,
        String imageUrl
) {
    public static VariantDto from(ProductVariant v) {
        return new VariantDto(
                v.getId(), v.getName(), v.getCode(),
                v.getCost(), v.getPrice(),
                v.getWholesalePrice(), v.getMinPrice(),
                v.getImageUrl());
    }
}
