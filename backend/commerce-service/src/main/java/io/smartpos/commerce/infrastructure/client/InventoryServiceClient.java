package io.smartpos.commerce.infrastructure.client;

import io.github.resilience4j.circuitbreaker.annotation.CircuitBreaker;
import io.github.resilience4j.retry.annotation.Retry;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import java.util.Map;
import java.util.UUID;

@Slf4j
@Component
public class InventoryServiceClient {

    private final RestClient client;

    public InventoryServiceClient(@Qualifier("inventoryServiceRestClient") RestClient client) {
        this.client = client;
    }

    @CircuitBreaker(name = "inventory-service", fallbackMethod = "getStockFallback")
    @Retry(name = "inventory-service")
    public Map<String, Object> getStock(UUID productId, UUID warehouseId) {
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

    @CircuitBreaker(name = "inventory-service", fallbackMethod = "reserveStockFallback")
    @Retry(name = "inventory-service")
    public Map<String, Object> reserveStock(UUID productId, UUID warehouseId, int quantity) {
        Map<String, Object> body = new java.util.LinkedHashMap<>();
        body.put("productId", productId.toString());
        body.put("warehouseId", warehouseId.toString());
        body.put("quantity", quantity);
        return client.post()
            .uri("/api/v1/stock/reserve")
            .body(body)
            .retrieve()
            .body(Map.class);
    }

    @SuppressWarnings("unused")
    public Map<String, Object> reserveStockFallback(UUID productId, UUID warehouseId, int quantity, Throwable t) {
        log.warn("Inventory service unavailable, stock reservation failed for product {}", productId);
        return Map.of("status", "failed", "error", "Inventory service unavailable");
    }

    @CircuitBreaker(name = "inventory-service", fallbackMethod = "releaseReservationFallback")
    @Retry(name = "inventory-service")
    public Map<String, Object> releaseReservation(UUID reservationId) {
        return client.post()
            .uri("/api/v1/stock/release/{reservationId}", reservationId)
            .retrieve()
            .body(Map.class);
    }

    @SuppressWarnings("unused")
    public Map<String, Object> releaseReservationFallback(UUID reservationId, Throwable t) {
        log.warn("Inventory service unavailable, failed to release reservation {}", reservationId);
        return Map.of("status", "failed", "error", "Inventory service unavailable");
    }
}
