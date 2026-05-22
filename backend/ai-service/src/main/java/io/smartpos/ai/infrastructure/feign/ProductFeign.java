package io.smartpos.ai.infrastructure.feign;

import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.web.bind.annotation.*;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.Map;
import java.util.UUID;

@FeignClient(name = "product-service",
    url = "${smartpos.ai.product-service-url:http://localhost:8083}")
public interface ProductFeign {

    record ProductDto(UUID id, String name, String sku, BigDecimal price,
                      BigDecimal cost, UUID categoryId, UUID brandId,
                      Boolean status, String imageUrl, Instant createdAt,
                      Instant updatedAt) {}

    @GetMapping("/api/v1/products")
    Page<ProductDto> search(@RequestParam(required = false) String search,
                            @RequestParam(required = false) UUID categoryId,
                            @RequestParam(required = false) UUID brandId,
                            @RequestParam(required = false) Boolean status,
                            Pageable pageable);

    @PostMapping("/api/v1/products")
    Map<String, Object> createProduct(@RequestBody Map<String, Object> body);

    @PutMapping("/api/v1/products/{id}")
    Map<String, Object> updateProduct(@PathVariable UUID id, @RequestBody Map<String, Object> body);
}
