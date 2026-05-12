package io.smartpos.commerce.api.storefront;

import io.smartpos.commerce.application.ProductPublishingService;
import io.smartpos.commerce.application.StoreService;
import io.smartpos.common.context.TenantContext;
import io.smartpos.commerce.domain.model.PublishedProduct;
import io.smartpos.commerce.domain.model.Store;
import io.smartpos.commerce.infrastructure.client.ProductServiceClient;
import io.smartpos.commerce.infrastructure.client.InventoryServiceClient;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.web.bind.annotation.*;

import java.util.*;

@RestController
@RequestMapping("/api/v1/storefront/{slug}")
@RequiredArgsConstructor
public class StorefrontProductController {

    private final StoreService storeService;
    private final ProductPublishingService publishingService;
    private final ProductServiceClient productServiceClient;
    private final InventoryServiceClient inventoryServiceClient;

    @GetMapping("/products")
    public Page<Map<String, Object>> listProducts(
        @PathVariable String slug,
        @RequestParam(required = false) String search,
        @RequestParam(required = false) UUID categoryId,
        Pageable pageable) {
        Store store = storeService.getBySlug(slug);
        TenantContext.set(store.getTenantId());
        Page<PublishedProduct> published = publishingService.listPublished(
            store.getId(), search, pageable);
        // For MVP, return published product metadata. Full composite response
        // (joining with product-service data) will be added when the
        // StorefrontQueryService is built.
        List<Map<String, Object>> content = published.getContent().stream()
            .map(pp -> {
                Map<String, Object> m = new HashMap<>();
                m.put("id", pp.getProductId());
                m.put("slug", pp.getSlug());
                m.put("metaTitle", pp.getMetaTitle());
                m.put("metaDescription", pp.getMetaDescription());
                m.put("ogImageUrl", pp.getOgImageUrl());
                m.put("isFeatured", pp.isFeatured());
                return m;
            }).toList();
        return new PageImpl<>(content, pageable, published.getTotalElements());
    }

    @GetMapping("/products/featured")
    public List<Map<String, Object>> listFeatured(@PathVariable String slug) {
        Store store = storeService.getBySlug(slug);
        TenantContext.set(store.getTenantId());
        Page<PublishedProduct> featured = publishingService.listFeatured(
            store.getId(), Pageable.ofSize(20));
        return featured.getContent().stream()
            .map(pp -> {
                Map<String, Object> m = new HashMap<>();
                m.put("id", pp.getProductId());
                m.put("slug", pp.getSlug());
                m.put("metaTitle", pp.getMetaTitle());
                m.put("ogImageUrl", pp.getOgImageUrl());
                m.put("isFeatured", true);
                return m;
            }).toList();
    }

    @GetMapping("/products/{idOrSlug}")
    public Map<String, Object> getProduct(
        @PathVariable String slug,
        @PathVariable String idOrSlug) {
        Store store = storeService.getBySlug(slug);
        TenantContext.set(store.getTenantId());
        PublishedProduct pp;
        try {
            UUID productId = UUID.fromString(idOrSlug);
            pp = publishingService.listPublished(store.getId(), null, Pageable.unpaged())
                .getContent().stream()
                .filter(p -> p.getProductId().equals(productId))
                .findFirst()
                .orElse(null);
        } catch (IllegalArgumentException e) {
            pp = publishingService.getBySlug(store.getId(), idOrSlug);
        }
        if (pp == null) throw new IllegalArgumentException("Product not found: " + idOrSlug);

        Map<String, Object> product = productServiceClient.getProduct(pp.getProductId());
        // Merge commerce metadata
        product.put("slug", pp.getSlug());
        product.put("seo", Map.of(
            "title", pp.getMetaTitle() != null ? pp.getMetaTitle() : product.getOrDefault("name", ""),
            "description", pp.getMetaDescription() != null ? pp.getMetaDescription() : ""
        ));
        return product;
    }
}
