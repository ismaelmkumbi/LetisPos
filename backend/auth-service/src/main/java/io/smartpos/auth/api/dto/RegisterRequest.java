package io.smartpos.auth.api.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.util.UUID;

public record RegisterRequest(
        @Email @NotBlank String email,
        String username,
        @NotBlank @Size(min = 8, max = 255) String password,
        String firstName,
        String lastName,
        UUID tenantId,
        String tenantName,
        String tenantSlug,
        String billingPlan
) {}
