package io.smartpos.commerce.api.dto.storefront;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record StorefrontProductResponse(
    UUID id, String slug, String name, String description,
    PriceInfo price, BigDecimal compareAtPrice,
    List<ImageInfo> images, List<VariantInfo> variants,
    CategoryInfo category, BrandInfo brand,
    StockInfo stock, boolean isFeatured,
    SeoInfo seo, Instant createdAt
) {
    public record PriceInfo(BigDecimal amount, String currency, String display) {}
    public record ImageInfo(String url, String alt, int width, int height) {}
    public record VariantInfo(String name, List<String> values) {}
    public record CategoryInfo(UUID id, String name, String slug) {}
    public record BrandInfo(UUID id, String name) {}
    public record StockInfo(String status, int quantity) {}
    public record SeoInfo(String title, String description) {}
}
