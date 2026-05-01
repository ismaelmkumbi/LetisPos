package io.smartpos.user.api.dto;

import io.smartpos.user.domain.model.UserProfile;

import java.time.Instant;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

public record UserDto(
        UUID id,
        String email,
        String firstName,
        String lastName,
        String phone,
        String avatarUrl,
        String address,
        String city,
        String country,
        boolean isAllWarehouses,
        boolean active,
        Set<UUID> warehouseIds,
        List<String> roles,
        List<String> permissions,
        Instant createdAt,
        Instant updatedAt
) {
    public static UserDto from(UserProfile u) {
        List<String> roleNames = u.getRoles().stream().map(r -> r.getName()).collect(Collectors.toList());
        List<String> perms = u.getRoles().stream()
                .flatMap(r -> r.getPermissions().stream())
                .map(p -> p.getName())
                .distinct()
                .collect(Collectors.toList());
        return new UserDto(
                u.getId(), u.getEmail(), u.getFirstName(), u.getLastName(), u.getPhone(),
                u.getAvatarUrl(), u.getAddress(), u.getCity(), u.getCountry(),
                u.isAllWarehouses(), u.isActive(), u.getWarehouseIds(),
                roleNames, perms, u.getCreatedAt(), u.getUpdatedAt()
        );
    }
}
