package io.smartpos.auth.api.dto;

import jakarta.validation.constraints.NotBlank;

public record CloseRequest(@NotBlank String reason) {}
