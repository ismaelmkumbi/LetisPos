package io.smartpos.product.api.dto;

import io.smartpos.product.domain.model.Category;
import jakarta.validation.constraints.NotBlank;

import java.util.UUID;

public record CategoryDto(
        UUID id, UUID parentId, String name, String code, String imageUrl, String description
) {
    public static CategoryDto from(Category c) {
        return new CategoryDto(c.getId(), c.getParentId(), c.getName(), c.getCode(),
                c.getImageUrl(), c.getDescription());
    }

    public record CreateRequest(
            @NotBlank String name,
            String code,
            UUID parentId,
            String imageUrl,
            String description
    ) {}
}
