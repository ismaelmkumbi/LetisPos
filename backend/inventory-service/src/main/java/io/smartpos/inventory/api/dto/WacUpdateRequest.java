package io.smartpos.inventory.api.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

public record WacUpdateRequest(@NotEmpty List<@Valid Item> items) {
    public record Item(
            @NotNull UUID productId,
            UUID variantId,
            @NotNull UUID warehouseId,
            @NotNull BigDecimal weightedAvgCost) {}
}
