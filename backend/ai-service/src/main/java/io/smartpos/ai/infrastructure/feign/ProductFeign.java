package io.smartpos.ai.infrastructure.feign;

import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.web.bind.annotation.*;
import java.math.BigDecimal;
import java.util.UUID;

@FeignClient(name = "product-service",
    url = "${smartpos.ai.product-service-url:http://localhost:8083}")
public interface ProductFeign {

    record ProductDto(UUID id, String name, String sku, BigDecimal price,
                      BigDecimal cost, UUID categoryId, UUID brandId,
                      Boolean status, String imageUrl) {}

    @GetMapping("/api/v1/products")
    Page<ProductDto> search(@RequestParam(required = false) String search,
                            @RequestParam(required = false) UUID categoryId,
                            @RequestParam(required = false) UUID brandId,
                            @RequestParam(required = false) Boolean status,
                            Pageable pageable);
}
