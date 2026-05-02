package io.smartpos.inventory.api.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

public class ReservationDto {

    public record Line(
            @NotNull UUID productId,
            UUID variantId,
            @NotNull UUID warehouseId,
            @NotNull @DecimalMin("0.0001") BigDecimal qty
    ) {}

    public record CreateRequest(
            @NotNull UUID saleId,
            @NotEmpty List<@Valid Line> lines,
            Integer ttlMinutes
    ) {}

    public record Response(
            UUID id,
            UUID saleId,
            List<Line> lines,
            Instant expiresAt,
            String status
    ) {}
}
