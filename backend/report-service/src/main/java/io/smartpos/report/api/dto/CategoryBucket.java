package io.smartpos.report.api.dto;

import java.math.BigDecimal;
import java.util.UUID;

public record CategoryBucket(UUID categoryId, String categoryName, long count, BigDecimal net) {}
