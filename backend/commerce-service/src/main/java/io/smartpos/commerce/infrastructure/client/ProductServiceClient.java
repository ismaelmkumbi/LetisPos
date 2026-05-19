package io.smartpos.commerce.infrastructure.client;

import io.github.resilience4j.circuitbreaker.annotation.CircuitBreaker;
import io.github.resilience4j.retry.annotation.Retry;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import java.util.*;

@Slf4j
@Component
@RequiredArgsConstructor
public class ProductServiceClient {

    private final RestClient.Builder restClientBuilder;

    @CircuitBreaker(name = "product-service", fallbackMethod = "getProductFallback")
    @Retry(name = "product-service")
    public Map<String, Object> getProduct(UUID productId) {
        var client = restClientBuilder.build();
        return client.get()
            .uri("/api/v1/products/{id}", productId)
            .retrieve()
            .body(Map.class);
    }

    @SuppressWarnings("unused")
    public Map<String, Object> getProductFallback(UUID productId, Throwable t) {
        log.warn("Product service unavailable for product {}", productId);
        return Map.of("id", productId.toString(), "name", "Unavailable", "status", "error");
    }

    @CircuitBreaker(name = "product-service")
    @Retry(name = "product-service")
    public Map<String, Object> getProductsPage(int page, int size) {
        var client = restClientBuilder.build();
        return client.get()
            .uri("/api/v1/products?page={page}&size={size}", page, size)
            .retrieve()
            .body(Map.class);
    }

    /**
     * Search products with filters. Used to cross-reference with published
     * products for storefront filtering.
     */
    @CircuitBreaker(name = "product-service")
    @Retry(name = "product-service")
    @SuppressWarnings("unchecked")
    public List<Map<String, Object>> searchProducts(String search, UUID categoryId,
                                                     UUID brandId, Boolean status,
                                                     int page, int size) {
        var client = restClientBuilder.build();
        StringBuilder uri = new StringBuilder();
        uri.append("/api/v1/products?page=").append(page).append("&size=").append(size);
        if (search != null && !search.isBlank()) {
            uri.append("&search=").append(search);
        }
        if (categoryId != null) {
            uri.append("&categoryId=").append(categoryId);
        }
        if (brandId != null) {
            uri.append("&brandId=").append(brandId);
        }
        if (status != null) {
            uri.append("&status=").append(status);
        }
        try {
            Map<String, Object> result = client.get()
                .uri(uri.toString())
                .retrieve()
                .body(Map.class);
            Object content = result != null ? result.get("content") : null;
            return content instanceof List ? (List<Map<String, Object>>) content : Collections.emptyList();
        } catch (Exception e) {
            log.warn("Product service search failed: {}", e.getMessage());
            return Collections.emptyList();
        }
    }

    @CircuitBreaker(name = "product-service")
    @Retry(name = "product-service")
    public Map<String, Object> getBrand(UUID brandId) {
        var client = restClientBuilder.build();
        try {
            return client.get()
                .uri("/api/v1/brands/{id}", brandId)
                .retrieve()
                .body(Map.class);
        } catch (Exception e) {
            log.warn("Failed to fetch brand {}: {}", brandId, e.getMessage());
            return null;
        }
    }

    @CircuitBreaker(name = "product-service")
    @Retry(name = "product-service")
    public Map<String, Object> getCategory(UUID categoryId) {
        var client = restClientBuilder.build();
        try {
            return client.get()
                .uri("/api/v1/categories/{id}", categoryId)
                .retrieve()
                .body(Map.class);
        } catch (Exception e) {
            log.warn("Failed to fetch category {}: {}", categoryId, e.getMessage());
            return null;
        }
    }

    @CircuitBreaker(name = "product-service")
    @Retry(name = "product-service")
    public Map<String, Object> getBrands() {
        var client = restClientBuilder.build();
        try {
            return client.get()
                .uri("/api/v1/brands?size=1000")
                .retrieve()
                .body(Map.class);
        } catch (Exception e) {
            log.warn("Failed to fetch brands: {}", e.getMessage());
            return Collections.emptyMap();
        }
    }

    @CircuitBreaker(name = "product-service")
    @Retry(name = "product-service")
    public Map<String, Object> getCategories() {
        var client = restClientBuilder.build();
        try {
            return client.get()
                .uri("/api/v1/categories")
                .retrieve()
                .body(Map.class);
        } catch (Exception e) {
            log.warn("Failed to fetch categories from product-service: {}", e.getMessage());
            return Collections.emptyMap();
        }
    }
}
