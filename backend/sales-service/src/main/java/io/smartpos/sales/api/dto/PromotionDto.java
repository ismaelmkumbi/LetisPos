package io.smartpos.sales.api.dto;

import io.smartpos.sales.domain.model.Promotion;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

public record PromotionDto(
    UUID id,
    UUID tenantId,
    String name,
    String type,
    BigDecimal discountValue,
    LocalDate startDate,
    LocalDate endDate,
    String appliesTo,
    String productIds,
    String categoryIds,
    BigDecimal minPurchaseAmount,
    BigDecimal maxDiscountAmount,
    boolean active,
    String createdAt,
    String updatedAt
) {
    public static PromotionDto from(Promotion p) {
        return new PromotionDto(
            p.getId(), p.getTenantId(), p.getName(), p.getType(),
            p.getDiscountValue(), p.getStartDate(), p.getEndDate(),
            p.getAppliesTo(), p.getProductIds(), p.getCategoryIds(),
            p.getMinPurchaseAmount(), p.getMaxDiscountAmount(),
            p.isActive(),
            p.getCreatedAt() != null ? p.getCreatedAt().toString() : null,
            p.getUpdatedAt() != null ? p.getUpdatedAt().toString() : null
        );
    }
}
