package io.smartpos.commerce.api.dto.admin;

import io.smartpos.commerce.domain.model.PublishedProduct;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record PublishedProductDto(
    UUID id, UUID storeId, UUID productId, String slug,
    String metaTitle, String metaDescription, String ogImageUrl,
    List<String> galleryUrls, boolean featured, int displayOrder,
    BigDecimal customPrice, Instant publishedAt, Instant unpublishedAt
) {
    public static PublishedProductDto from(PublishedProduct pp) {
        return new PublishedProductDto(
            pp.getId(), pp.getStoreId(), pp.getProductId(), pp.getSlug(),
            pp.getMetaTitle(), pp.getMetaDescription(), pp.getOgImageUrl(),
            pp.getGalleryUrls(), pp.isFeatured(), pp.getDisplayOrder(),
            pp.getCustomPrice(), pp.getPublishedAt(), pp.getUnpublishedAt()
        );
    }
}
