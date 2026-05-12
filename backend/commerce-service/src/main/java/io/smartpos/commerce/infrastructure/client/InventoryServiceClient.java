package io.smartpos.commerce.infrastructure.client;

import io.github.resilience4j.circuitbreaker.annotation.CircuitBreaker;
import io.github.resilience4j.retry.annotation.Retry;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import java.util.Map;
import java.util.UUID;

@Slf4j
@Component
@RequiredArgsConstructor
public class InventoryServiceClient {

    private final RestClient.Builder restClientBuilder;

    @CircuitBreaker(name = "inventory-service", fallbackMethod = "getStockFallback")
    @Retry(name = "inventory-service")
    public Map<String, Object> getStock(UUID productId, UUID warehouseId) {
        var client = restClientBuilder.build();
        return client.get()
            .uri("/api/v1/stock/warehouse/{warehouseId}/product/{productId}", warehouseId, productId)
            .retrieve()
            .body(Map.class);
    }

    @SuppressWarnings("unused")
    public Map<String, Object> getStockFallback(UUID productId, UUID warehouseId, Throwable t) {
        log.warn("Inventory service unavailable, returning unknown stock");
        return Map.of("status", "unknown", "quantity", 0);
    }
}
