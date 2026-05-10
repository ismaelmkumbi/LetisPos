package io.smartpos.documents.infrastructure.feign;

import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import java.util.Map;
import java.util.UUID;

@FeignClient(name = "purchase-service", url = "${spring.cloud.openfeign.client.config.purchase-service.url}")
public interface PurchaseClient {
    @GetMapping("/api/v1/purchases/{id}")
    Map<String, Object> getPurchase(@PathVariable UUID id);
}
