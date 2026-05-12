package io.smartpos.commerce.api.dto.admin;

import io.smartpos.commerce.domain.model.CategoryDisplay;
import java.util.UUID;

public record CategoryDisplayDto(
    UUID id, UUID storeId, UUID categoryId, String nameOverride,
    String description, String imageUrl, int displayOrder,
    boolean isVisible, UUID parentId
) {
    public static CategoryDisplayDto from(CategoryDisplay cd) {
        return new CategoryDisplayDto(
            cd.getId(), cd.getStoreId(), cd.getCategoryId(),
            cd.getNameOverride(), cd.getDescription(), cd.getImageUrl(),
            cd.getDisplayOrder(), cd.isVisible(), cd.getParentId()
        );
    }
}
