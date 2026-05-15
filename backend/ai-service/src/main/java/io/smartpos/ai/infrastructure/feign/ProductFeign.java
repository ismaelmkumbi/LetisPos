package io.smartpos.ai.infrastructure.feign;

import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

@FeignClient(name = "product-service",
    url = "${smartpos.ai.product-service-url:http://localhost:8083}")
public interface ProductFeign {

    record ProductSummary(UUID id, String name, String sku, BigDecimal price,
                          BigDecimal stock, String categoryName) {}

    @GetMapping("/api/v1/products/search")
    List<ProductSummary> search(@RequestParam String q, @RequestParam int limit);
}
