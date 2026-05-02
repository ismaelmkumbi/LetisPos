package io.smartpos.user.api.dto;

import io.smartpos.user.domain.model.Role;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

public record RoleDto(
        UUID id,
        String name,
        String label,
        String description,
        boolean isSystem,
        List<String> permissions
) {
    public static RoleDto from(Role r) {
        return new RoleDto(
                r.getId(), r.getName(), r.getLabel(), r.getDescription(), r.isSystem(),
                r.getPermissions().stream().map(p -> p.getName()).collect(Collectors.toList())
        );
    }
}
