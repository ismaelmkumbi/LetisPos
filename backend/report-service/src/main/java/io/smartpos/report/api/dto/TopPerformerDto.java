package io.smartpos.report.api.dto;

import java.math.BigDecimal;
import java.util.UUID;

public record TopPerformerDto(
    UUID id,
    String name,
    BigDecimal value,
    BigDecimal percentage
) {}
