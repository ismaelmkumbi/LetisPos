package io.smartpos.product.api.dto;

import java.math.BigDecimal;
import java.util.UUID;

public record SupplierBalanceDto(
        UUID supplierId,
        String supplierName,
        BigDecimal totalPurchases,
        BigDecimal totalPaid,
        BigDecimal balance
) {}
