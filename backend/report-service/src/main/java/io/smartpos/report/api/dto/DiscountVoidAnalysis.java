package io.smartpos.report.api.dto;

import java.math.BigDecimal;

public record DiscountVoidAnalysis(BigDecimal totalDiscounts, long discountCount,
                                   BigDecimal totalVoids, long voidCount,
                                   BigDecimal discountRate, BigDecimal voidRate) {}
