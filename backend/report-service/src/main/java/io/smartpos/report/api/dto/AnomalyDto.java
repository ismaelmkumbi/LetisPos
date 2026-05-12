package io.smartpos.report.api.dto;

import java.math.BigDecimal;

public record AnomalyDto(
    String metric,
    BigDecimal currentValue,
    BigDecimal averageValue,
    BigDecimal deviation,
    String severity  // "warning" or "error"
) {}
