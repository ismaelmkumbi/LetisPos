package io.smartpos.documents.infrastructure.feign;

import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;

import java.util.Map;
import java.util.UUID;

/**
 * Feign client for product-service — resolves product names for document templates.
 */
@FeignClient(name = "product-service", contextId = "docProductClient", url = "${spring.cloud.openfeign.client.config.product-service.url:http://localhost:8083}")
public interface ProductClient {

    @GetMapping("/api/v1/products/{id}")
    Map<String, Object> getProduct(@PathVariable UUID id);
}
