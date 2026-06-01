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
public class SalesServiceClient {

    private final RestClient client;

    public SalesServiceClient(@Qualifier("salesServiceRestClient") RestClient client) {
        this.client = client;
    }

    @CircuitBreaker(name = "sales-service")
    @Retry(name = "sales-service")
    public Map<String, Object> createOrder(Map<String, Object> orderRequest) {
        return client.post()
            .uri("/api/v1/sales")
            .body(orderRequest)
            .retrieve()
            .body(Map.class);
    }

    @CircuitBreaker(name = "sales-service")
    public Map<String, Object> getOrder(UUID orderId) {
        return client.get()
            .uri("/api/v1/sales/{id}", orderId)
            .retrieve()
            .body(Map.class);
    }

    /**
     * Search sales by customer with optional filters.
     * The sales service supports customerId filtering on the admin endpoint,
     * but the commerce service proxies this for storefront customers.
     */
    @CircuitBreaker(name = "sales-service")
    @SuppressWarnings("unchecked")
    public Map<String, Object> getOrdersByCustomer(UUID customerId, int page, int size) {
        Map<String, Object> result = client.get()
            .uri("/api/v1/sales?customerId={customerId}&page={page}&size={size}",
                customerId, page, size)
            .retrieve()
            .body(Map.class);
        return result != null ? result : Map.of("content", java.util.List.of(), "totalElements", 0);
    }
}
