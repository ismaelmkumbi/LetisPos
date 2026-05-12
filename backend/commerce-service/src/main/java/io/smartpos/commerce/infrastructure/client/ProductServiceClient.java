package io.smartpos.commerce.infrastructure.client;

import io.github.resilience4j.circuitbreaker.annotation.CircuitBreaker;
import io.github.resilience4j.retry.annotation.Retry;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import java.util.Collections;
import java.util.Map;
import java.util.UUID;

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
