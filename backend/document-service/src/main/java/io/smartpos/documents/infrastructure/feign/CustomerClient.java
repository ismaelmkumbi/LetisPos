package io.smartpos.documents.infrastructure.feign;

import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;

import java.util.Map;
import java.util.UUID;

/**
 * Feign client for product-service customer endpoints.
 * Used to resolve customer names for document templates.
 */
@FeignClient(name = "product-service", contextId = "docCustomerClient", url = "${spring.cloud.openfeign.client.config.product-service.url:http://localhost:8083}")
public interface CustomerClient {

    @GetMapping("/api/v1/customers/{id}")
    Map<String, Object> getCustomer(@PathVariable UUID id);
}
