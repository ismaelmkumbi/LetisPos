package io.smartpos.ai.infrastructure.feign;

import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.*;
import java.util.Map;
import java.util.UUID;

@FeignClient(name = "customer-service",
    url = "${smartpos.ai.customer-service-url:http://localhost:8085}")
public interface CustomerFeign {

    @PostMapping("/api/v1/customers")
    Map<String, Object> createCustomer(@RequestBody Map<String, Object> body);

    @PutMapping("/api/v1/customers/{id}")
    Map<String, Object> updateCustomer(@PathVariable UUID id, @RequestBody Map<String, Object> body);
}
