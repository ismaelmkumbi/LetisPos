package io.smartpos.inventory.api.dto;

import jakarta.validation.constraints.NotBlank;

public record DamageRejectRequest(@NotBlank String reason) {}
