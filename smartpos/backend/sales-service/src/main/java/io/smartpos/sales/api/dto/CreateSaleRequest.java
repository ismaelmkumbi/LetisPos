package io.smartpos.sales.api.dto;

import io.smartpos.sales.domain.model.TaxMethod;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public record CreateSaleRequest(
        LocalDate date,
        UUID customerId,
        @NotNull UUID warehouseId,
        @NotEmpty List<@Valid SaleLineInput> lines,
        BigDecimal discount,        // header-level
        TaxMethod taxMethod,
        BigDecimal shipping,
        String currency,
        BigDecimal exchangeRate,
        String notes,
        Boolean isPos               // mark POS sales for reporting
) {}
