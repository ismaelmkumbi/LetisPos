package io.smartpos.sales.infrastructure.feign;

import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;

import java.util.UUID;

/**
 * Minimal Feign client for product-service name resolution.
 */
@FeignClient(name = "product-service")
public interface ProductClient {

    record ProductNameDto(UUID id, String name) {}

    @GetMapping("/api/v1/products/{id}")
    ProductNameDto getProduct(@PathVariable UUID id);
}
