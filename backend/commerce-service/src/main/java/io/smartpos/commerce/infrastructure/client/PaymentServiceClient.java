package io.smartpos.commerce.infrastructure.client;

import io.github.resilience4j.circuitbreaker.annotation.CircuitBreaker;
import io.github.resilience4j.retry.annotation.Retry;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import java.util.Map;

@Slf4j
@Component
@RequiredArgsConstructor
public class PaymentServiceClient {

    private final RestClient.Builder restClientBuilder;

    @CircuitBreaker(name = "product-service")
    @Retry(name = "product-service")
    public Map<String, Object> capturePayment(Map<String, Object> paymentRequest) {
        var client = restClientBuilder.build();
        return client.post()
            .uri("/api/v1/payments/capture")
            .body(paymentRequest)
            .retrieve()
            .body(Map.class);
    }
}
