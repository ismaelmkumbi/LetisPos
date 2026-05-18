package io.smartpos.product.api.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

public record BulkPriceUpdateRequest(
        Scope scope,
        @NotNull List<FieldUpdate> updates
) {
    public enum UpdateMode { SET, INCREASE, DECREASE, INCREASE_PERCENT, DECREASE_PERCENT }

    public enum Field { cost, price, wholesale_price, min_price }

    public record Scope(UUID categoryId, UUID brandId, List<UUID> productIds) {}

    public record FieldUpdate(
            @NotNull Field field,
            @NotNull UpdateMode mode,
            @NotNull @DecimalMin("0.0") BigDecimal value
    ) {}
}
