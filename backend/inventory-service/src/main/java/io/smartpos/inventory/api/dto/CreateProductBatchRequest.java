package io.smartpos.inventory.api.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

public record CreateProductBatchRequest(
        @NotBlank String batchNumber,
        @NotNull UUID productId,
        UUID variantId,
        @NotNull UUID warehouseId,
        LocalDate manufacturingDate,
        LocalDate expiryDate,
        @NotNull @Positive BigDecimal qty
) {}
