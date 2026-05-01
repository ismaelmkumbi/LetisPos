package io.smartpos.product.api.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

public record ImportOpeningStockRequest(
        @NotNull UUID warehouseId,
        @NotNull List<Item> items
) {
    public record Item(
            @NotBlank String productCode,
            String variantCode,
            @NotNull @PositiveOrZero BigDecimal qty
    ) {}
}
