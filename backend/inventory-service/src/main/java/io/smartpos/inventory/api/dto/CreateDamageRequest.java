package io.smartpos.inventory.api.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import java.math.BigDecimal;
import java.util.UUID;

public record CreateDamageRequest(
    @NotNull UUID warehouseId,
    @NotNull UUID productId,
    UUID variantId,
    @NotNull @Positive BigDecimal qty,
    @NotNull String reasonCode,
    String notes,
    @NotNull String movementType  // "DAMAGE" or "WASTE"
) {}
