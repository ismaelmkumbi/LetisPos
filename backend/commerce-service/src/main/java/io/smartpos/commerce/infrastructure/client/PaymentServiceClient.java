package io.smartpos.commerce.infrastructure.client;

import io.github.resilience4j.circuitbreaker.annotation.CircuitBreaker;
import io.github.resilience4j.retry.annotation.Retry;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import java.util.Map;

@Slf4j
@Component
public class PaymentServiceClient {

    private final RestClient client;

    public PaymentServiceClient(@Qualifier("paymentServiceRestClient") RestClient client) {
        this.client = client;
    }

    @CircuitBreaker(name = "payment-service")
    @Retry(name = "payment-service")
    public Map<String, Object> capturePayment(Map<String, Object> paymentRequest) {
        return client.post()
            .uri("/api/v1/payments/capture")
            .body(paymentRequest)
            .retrieve()
            .body(Map.class);
    }

    /**
     * Fetch the active tax rate for the current tenant from the payment service.
     * Returns the first active tax rate, or a default of 10% if none configured.
     */
    @CircuitBreaker(name = "payment-service", fallbackMethod = "getActiveTaxRateFallback")
    @SuppressWarnings("unchecked")
    public java.math.BigDecimal getActiveTaxRate() {
        try {
            Map<String, Object> result = client.get()
                .uri("/api/v1/taxes?active=true")
                .retrieve()
                .body(Map.class);
            if (result != null && result.get("content") instanceof java.util.List list && !list.isEmpty()) {
                Map<String, Object> first = (Map<String, Object>) list.get(0);
                Object rate = first.get("rate");
                if (rate instanceof Number n) {
                    return java.math.BigDecimal.valueOf(n.doubleValue()).divide(
                        java.math.BigDecimal.valueOf(100));
                }
            }
        } catch (Exception e) {
            log.warn("Failed to fetch tax rate from payment service: {}", e.getMessage());
        }
        return new java.math.BigDecimal("0.10"); // default 10%
    }

    @SuppressWarnings("unused")
    public java.math.BigDecimal getActiveTaxRateFallback(Throwable t) {
        log.warn("Payment service unavailable, using default 10% tax rate");
        return new java.math.BigDecimal("0.10");
    }
}
