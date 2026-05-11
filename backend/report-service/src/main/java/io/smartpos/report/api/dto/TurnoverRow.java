package io.smartpos.report.api.dto;

import java.math.BigDecimal;
import java.util.UUID;

public record TurnoverRow(UUID productId, String productName, String productCode,
                           BigDecimal avgInventory, BigDecimal costOfGoodsSold,
                           double turnoverRatio) {}
