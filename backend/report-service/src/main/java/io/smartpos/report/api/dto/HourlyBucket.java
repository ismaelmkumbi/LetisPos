package io.smartpos.report.api.dto;

import java.math.BigDecimal;

public record HourlyBucket(int hour, long count, BigDecimal net) {}
