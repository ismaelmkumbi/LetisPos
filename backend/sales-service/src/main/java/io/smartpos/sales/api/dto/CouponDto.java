package io.smartpos.sales.api.dto;

import io.smartpos.sales.domain.model.Coupon;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

public record CouponDto(
    UUID id,
    UUID tenantId,
    String code,
    String type,
    BigDecimal discountValue,
    Integer maxUses,
    int usedCount,
    BigDecimal minPurchaseAmount,
    BigDecimal maxDiscountAmount,
    LocalDate validFrom,
    LocalDate validUntil,
    boolean active,
    String createdAt,
    String updatedAt
) {
    public static CouponDto from(Coupon c) {
        return new CouponDto(
            c.getId(), c.getTenantId(), c.getCode(), c.getType(),
            c.getDiscountValue(), c.getMaxUses(), c.getUsedCount(),
            c.getMinPurchaseAmount(), c.getMaxDiscountAmount(),
            c.getValidFrom(), c.getValidUntil(),
            c.isActive(),
            c.getCreatedAt() != null ? c.getCreatedAt().toString() : null,
            c.getUpdatedAt() != null ? c.getUpdatedAt().toString() : null
        );
    }
}
