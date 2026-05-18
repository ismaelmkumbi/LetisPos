package io.smartpos.product.api.dto;

import jakarta.validation.constraints.NotNull;

import java.util.List;
import java.util.UUID;

public record BatchStatusRequest(
        @NotNull List<UUID> productIds,
        @NotNull Boolean status
) {}
