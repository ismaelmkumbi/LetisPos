package io.smartpos.inventory.api.dto;

import io.smartpos.inventory.domain.model.Warehouse;
import jakarta.validation.constraints.NotBlank;

import java.util.UUID;

public record WarehouseDto(
        UUID id, String code, String name, String city, String country,
        String phone, String email, String zip, String notes, boolean active
) {
    public static WarehouseDto from(Warehouse w) {
        return new WarehouseDto(w.getId(), w.getCode(), w.getName(), w.getCity(), w.getCountry(),
                w.getPhone(), w.getEmail(), w.getZip(), w.getNotes(), w.isActive());
    }
    public record CreateRequest(
            String code,
            @NotBlank String name,
            String city, String country, String phone, String email, String zip, String notes
    ) {}
    public record StatusRequest(boolean active) {}
}
