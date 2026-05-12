package io.smartpos.commerce.api.dto.admin;

import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

public record PublishProductRequest(
    @NotNull UUID productId,
    String slug,
    String metaTitle,
    String metaDescription,
    String ogImageUrl,
    List<String> galleryUrls,
    Boolean featured,
    Integer displayOrder,
    BigDecimal customPrice
) {}
