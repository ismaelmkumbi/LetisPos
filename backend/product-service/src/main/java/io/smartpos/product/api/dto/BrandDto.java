package io.smartpos.product.api.dto;

import io.smartpos.product.domain.model.Brand;
import jakarta.validation.constraints.NotBlank;

import java.util.UUID;

public record BrandDto(UUID id, String name, String imageUrl, String description) {
    public static BrandDto from(Brand b) {
        return new BrandDto(b.getId(), b.getName(), b.getImageUrl(), b.getDescription());
    }
    public record CreateRequest(@NotBlank String name, String imageUrl, String description) {}
}
