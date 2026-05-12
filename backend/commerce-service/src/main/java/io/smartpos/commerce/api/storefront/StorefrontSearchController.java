package io.smartpos.commerce.api.storefront;

import io.smartpos.commerce.application.StoreService;
import io.smartpos.common.context.TenantContext;
import io.smartpos.commerce.domain.model.PublishedProduct;
import io.smartpos.commerce.domain.model.Store;
import io.smartpos.commerce.domain.repository.ProductSearchRepository;
import io.smartpos.commerce.domain.repository.ProductSearchRepository.SearchResult;
import io.smartpos.commerce.infrastructure.client.ProductServiceClient;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.web.bind.annotation.*;

import java.util.*;

@RestController
@RequestMapping("/api/v1/storefront/{slug}")
@RequiredArgsConstructor
public class StorefrontSearchController {

    private final StoreService storeService;
    private final ProductSearchRepository searchRepository;
    private final ProductServiceClient productServiceClient;

    @GetMapping("/search")
    public Map<String, Object> search(
        @PathVariable String slug,
        @RequestParam("q") String query,
        @RequestParam(defaultValue = "0") int page,
        @RequestParam(defaultValue = "20") int size) {

        Store store = storeService.getBySlug(slug);
        TenantContext.set(store.getTenantId());

        // Try full-text search first, fall back to ILIKE
        SearchResult result;
        try {
            result = searchRepository.search(store.getId(), query, page, size);
        } catch (Exception e) {
            result = searchRepository.searchSimple(store.getId(), query, page, size);
        }

        // Enrich results with product service data where available
        List<Map<String, Object>> content = new ArrayList<>();
        for (PublishedProduct pp : result.products()) {
            Map<String, Object> item = new LinkedHashMap<>();
            item.put("id", pp.getProductId().toString());
            item.put("slug", pp.getSlug());
            item.put("metaTitle", pp.getMetaTitle());
            item.put("metaDescription", pp.getMetaDescription());
            item.put("ogImageUrl", pp.getOgImageUrl());
            item.put("isFeatured", pp.isFeatured());
            // Try to get product name/price from product-service
            try {
                Map<String, Object> product = productServiceClient.getProduct(pp.getProductId());
                item.put("name", product.getOrDefault("name", pp.getMetaTitle()));
                item.put("price", product.getOrDefault("price", Map.of()));
                item.put("images", product.getOrDefault("images", List.of()));
            } catch (Exception e) {
                item.put("name", pp.getMetaTitle() != null ? pp.getMetaTitle() : "Product");
                item.put("price", Map.of("amount", 0, "currency", store.getCurrency(), "display", "$0.00"));
                item.put("images", List.of());
            }
            content.add(item);
        }

        Map<String, Object> response = new LinkedHashMap<>();
        response.put("content", content);
        response.put("totalElements", result.total());
        response.put("totalPages", (int) Math.ceil((double) result.total() / size));
        response.put("number", page);
        response.put("size", size);
        return response;
    }
}
