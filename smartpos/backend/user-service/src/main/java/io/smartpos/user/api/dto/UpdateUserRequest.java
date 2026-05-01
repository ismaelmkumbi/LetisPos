package io.smartpos.user.api.dto;

import java.util.Set;
import java.util.UUID;

public record UpdateUserRequest(
        String firstName,
        String lastName,
        String phone,
        String address,
        String city,
        String country,
        Boolean isAllWarehouses,
        Boolean active,
        Set<UUID> warehouseIds,
        Set<UUID> roleIds
) {}
