package io.smartpos.report.api.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

public record ForecastDto(
    List<ForecastPoint> historical,
    List<ForecastPoint> projected
) {
    public record ForecastPoint(LocalDate date, BigDecimal value) {}
}
