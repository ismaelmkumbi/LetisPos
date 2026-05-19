package io.smartpos.commerce.api.storefront;

import io.smartpos.commerce.application.ProductPublishingService;
import io.smartpos.commerce.application.StoreService;
import io.smartpos.common.context.TenantContext;
import io.smartpos.commerce.domain.model.PublishedProduct;
import io.smartpos.commerce.domain.model.Store;
import io.smartpos.commerce.infrastructure.client.ProductServiceClient;
import io.smartpos.commerce.infrastructure.client.InventoryServiceClient;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.*;
import java.util.stream.Collectors;

@Slf4j
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
        @RequestParam(required = false) BigDecimal minPrice,
        @RequestParam(required = false) BigDecimal maxPrice,
        @RequestParam(required = false) String brand,
        @RequestParam(required = false) Boolean inStock,
        @RequestParam(required = false) Integer rating,
        Pageable pageable) {
        Store store = storeService.getBySlug(slug);
        TenantContext.set(store.getTenantId());

        // Get published products for this store
        Page<PublishedProduct> published = publishingService.listPublished(
            store.getId(), search, categoryId, pageable);

        // Batch-load reference data once (not N times per product)
        Map<UUID, String> brandNames = loadBrandNames();
        Map<UUID, Map<String, String>> categoryMap = loadCategoryMap();

        // Enrich each published product with product-service data
        List<Map<String, Object>> enriched = published.getContent().stream()
            .map(pp -> enrichProduct(pp, brandNames, categoryMap, store))
            .filter(m -> matchesFilters(m, minPrice, maxPrice, brand, inStock, categoryId))
            .collect(Collectors.toList());

        return new PageImpl<>(enriched, pageable, enriched.size());
    }

    @GetMapping("/products/featured")
    public List<Map<String, Object>> listFeatured(@PathVariable String slug) {
        Store store = storeService.getBySlug(slug);
        TenantContext.set(store.getTenantId());
        Page<PublishedProduct> featured = publishingService.listFeatured(
            store.getId(), Pageable.ofSize(20));
        Map<UUID, String> brandNames = loadBrandNames();
        Map<UUID, Map<String, String>> categoryMap = loadCategoryMap();
        return featured.getContent().stream()
            .map(pp -> enrichProduct(pp, brandNames, categoryMap, store))
            .toList();
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
            pp = publishingService.listPublished(store.getId(), null, null, Pageable.unpaged())
                .getContent().stream()
                .filter(p -> p.getProductId().equals(productId))
                .findFirst()
                .orElse(null);
        } catch (IllegalArgumentException e) {
            pp = publishingService.getBySlug(store.getId(), idOrSlug);
        }
        if (pp == null) throw new IllegalArgumentException("Product not found: " + idOrSlug);

        Map<String, Object> product = productServiceClient.getProduct(pp.getProductId());
        product.put("slug", pp.getSlug());
        product.put("seo", Map.of(
            "title", pp.getMetaTitle() != null ? pp.getMetaTitle() : product.getOrDefault("name", ""),
            "description", pp.getMetaDescription() != null ? pp.getMetaDescription() : ""
        ));
        return product;
    }

    // ── Private helpers ──

    private Map<String, Object> enrichProduct(PublishedProduct pp,
                                               Map<UUID, String> brandNames,
                                               Map<UUID, Map<String, String>> categoryMap,
                                               Store store) {
        Map<String, Object> m = new HashMap<>();
        m.put("id", pp.getProductId());
        m.put("slug", pp.getSlug());
        m.put("metaTitle", pp.getMetaTitle());
        m.put("metaDescription", pp.getMetaDescription());
        m.put("ogImageUrl", pp.getOgImageUrl());
        m.put("isFeatured", pp.isFeatured());

        try {
            Map<String, Object> product = productServiceClient.getProduct(pp.getProductId());
            m.put("name", product.getOrDefault("name", ""));
            m.put("description", product.getOrDefault("description", ""));
            m.put("price", product.get("price"));
            m.put("cost", product.get("cost"));
            m.put("imageUrl", product.get("imageUrl"));
            m.put("variants", product.get("variants"));
            m.put("barcodes", product.get("barcodes"));

            // Brand
            Object brandIdObj = product.get("brandId");
            if (brandIdObj instanceof UUID brandUuid && brandNames.containsKey(brandUuid)) {
                m.put("brand", Map.of("id", brandUuid.toString(), "name", brandNames.get(brandUuid)));
            }

            // Category
            Object catIdObj = product.get("categoryId");
            if (catIdObj instanceof UUID catUuid && categoryMap.containsKey(catUuid)) {
                m.put("category", categoryMap.get(catUuid));
            }

            // Stock
            try {
                Map<String, Object> stock = inventoryServiceClient.getStock(
                    pp.getProductId(), store.getId());
                Object quantity = stock.getOrDefault("quantity", 0);
                int qty = quantity instanceof Number n ? n.intValue() : 0;
                String stockStatus = qty > 10 ? "in_stock" : qty > 0 ? "low_stock" : "out_of_stock";
                m.put("stock", Map.of("status", stockStatus, "quantity", qty));
            } catch (Exception e) {
                m.put("stock", Map.of("status", "unknown", "quantity", 0));
            }
        } catch (Exception e) {
            log.warn("Failed to enrich product {}: {}", pp.getProductId(), e.getMessage());
            m.put("name", "Unavailable");
        }
        return m;
    }

    @SuppressWarnings("unchecked")
    private Map<UUID, String> loadBrandNames() {
        try {
            Map<String, Object> resp = productServiceClient.getBrands();
            Object content = resp.get("content");
            if (!(content instanceof List<?> list)) return Map.of();
            Map<UUID, String> map = new HashMap<>();
            for (Object item : list) {
                if (item instanceof Map<?, ?> b) {
                    Object id = b.get("id");
                    Object name = b.get("name");
                    if (id instanceof UUID uid && name instanceof String n) {
                        map.put(uid, n);
                    }
                }
            }
            return map;
        } catch (Exception e) {
            return Map.of();
        }
    }

    @SuppressWarnings("unchecked")
    private Map<UUID, Map<String, String>> loadCategoryMap() {
        try {
            Map<String, Object> resp = productServiceClient.getCategories();
            Object content = resp.get("content");
            if (!(content instanceof List<?> list)) return Map.of();
            Map<UUID, Map<String, String>> map = new HashMap<>();
            for (Object item : list) {
                if (item instanceof Map<?, ?> c) {
                    Object id = c.get("id");
                    Object name = c.get("name");
                    Object code = c.get("code");
                    if (id instanceof UUID uid) {
                        Map<String, String> cm = new HashMap<>();
                        cm.put("id", uid.toString());
                        cm.put("name", name instanceof String s ? s : "");
                        cm.put("slug", code instanceof String s ? s : uid.toString());
                        map.put(uid, cm);
                    }
                }
            }
            return map;
        } catch (Exception e) {
            return Map.of();
        }
    }

    private boolean matchesFilters(Map<String, Object> product,
                                    BigDecimal minPrice, BigDecimal maxPrice,
                                    String brand, Boolean inStock, UUID categoryId) {
        // Category filter
        if (categoryId != null) {
            Object catObj = product.get("category");
            if (catObj instanceof Map<?, ?> cat) {
                String catId = (String) cat.get("id");
                if (!categoryId.toString().equals(catId)) return false;
            } else {
                return false;
            }
        }

        // Price filter
        if (minPrice != null || maxPrice != null) {
            Object priceObj = product.get("price");
            if (priceObj instanceof Number n) {
                BigDecimal price = BigDecimal.valueOf(n.doubleValue());
                if (minPrice != null && price.compareTo(minPrice) < 0) return false;
                if (maxPrice != null && price.compareTo(maxPrice) > 0) return false;
            } else {
                return false;
            }
        }

        // Brand filter (comma-separated names)
        if (brand != null && !brand.isBlank()) {
            Set<String> brandNames = Arrays.stream(brand.split(","))
                .map(String::trim).map(String::toLowerCase).collect(Collectors.toSet());
            Object brandObj = product.get("brand");
            String brandName = null;
            if (brandObj instanceof Map<?, ?> b) {
                Object nameObj = b.get("name");
                brandName = nameObj != null ? nameObj.toString() : "";
            }
            if (brandName == null || brandName.isEmpty() || !brandNames.contains(brandName.toLowerCase())) {
                return false;
            }
        }

        // In-stock filter
        if (inStock != null && inStock) {
            Object stockObj = product.get("stock");
            if (stockObj instanceof Map<?, ?> s) {
                Object statusObj = s.get("status");
                if ("out_of_stock".equals(statusObj)) return false;
            }
        }

        return true;
    }
}
