package io.smartpos.auth.api.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.util.UUID;

public record ChangePasswordRequest(
        @NotBlank UUID userId,
        @NotBlank String currentPassword,
        @NotBlank @Size(min = 8, max = 255) String newPassword
) {}
