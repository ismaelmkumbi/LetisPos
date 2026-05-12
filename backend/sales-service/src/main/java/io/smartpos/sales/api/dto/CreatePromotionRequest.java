package io.smartpos.sales.api.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;
import java.time.LocalDate;

public record CreatePromotionRequest(
    @NotBlank String name,
    @NotBlank String type,
    @NotNull BigDecimal discountValue,
    @NotNull LocalDate startDate,
    LocalDate endDate,
    String appliesTo,
    String productIds,
    String categoryIds,
    BigDecimal minPurchaseAmount,
    BigDecimal maxDiscountAmount
) {}
