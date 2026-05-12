package io.smartpos.sales.api.dto;

import java.math.BigDecimal;
import java.util.UUID;

public record SalesByUserDto(UUID userId, String userName, long saleCount,
                             BigDecimal totalNet, BigDecimal totalGross, long itemsSold) {}
