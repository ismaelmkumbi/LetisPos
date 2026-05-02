package io.smartpos.product.api.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;

import java.math.BigDecimal;
import java.util.List;

public record ImportUpdateOnlyRequest(
        @NotNull List<Item> items
) {
    public record Item(
            @NotBlank String productCode,
            @NotNull @PositiveOrZero BigDecimal cost,
            @NotNull @PositiveOrZero BigDecimal retailPrice
    ) {}
}
