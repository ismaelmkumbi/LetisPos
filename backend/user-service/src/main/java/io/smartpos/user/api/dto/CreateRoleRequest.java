package io.smartpos.user.api.dto;

import jakarta.validation.constraints.NotBlank;

import java.util.Set;
import java.util.UUID;

public record CreateRoleRequest(
        @NotBlank String name,
        String label,
        String description,
        Set<UUID> permissionIds
) {}
