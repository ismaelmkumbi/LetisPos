package io.smartpos.auth.api.dto;

import jakarta.validation.constraints.NotBlank;

public record DeleteRequest(@NotBlank String reason) {}
