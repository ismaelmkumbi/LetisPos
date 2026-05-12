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
public class SalesServiceClient {

    private final RestClient.Builder restClientBuilder;

    @CircuitBreaker(name = "product-service")  // reuse product breaker name
    @Retry(name = "product-service")
    public Map<String, Object> createOrder(Map<String, Object> orderRequest) {
        var client = restClientBuilder.build();
        return client.post()
            .uri("/api/v1/sales")
            .body(orderRequest)
            .retrieve()
            .body(Map.class);
    }

    @CircuitBreaker(name = "product-service")
    public Map<String, Object> getOrder(UUID orderId) {
        var client = restClientBuilder.build();
        return client.get()
            .uri("/api/v1/sales/{id}", orderId)
            .retrieve()
            .body(Map.class);
    }
}
