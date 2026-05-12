package io.smartpos.sales.api.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;
import java.time.LocalDate;

public record CreateCouponRequest(
    @NotBlank String code,
    String type,
    @NotNull BigDecimal discountValue,
    Integer maxUses,
    BigDecimal minPurchaseAmount,
    BigDecimal maxDiscountAmount,
    @NotNull LocalDate validFrom,
    LocalDate validUntil
) {}
