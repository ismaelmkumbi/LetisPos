package io.smartpos.documents.infrastructure.feign;

import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import java.util.Map;
import java.util.UUID;

@FeignClient(name = "payment-service", url = "${spring.cloud.openfeign.client.config.payment-service.url}")
public interface PaymentClient {
    @GetMapping("/api/v1/payments/{id}")
    Map<String, Object> getPayment(@PathVariable UUID id);
}
