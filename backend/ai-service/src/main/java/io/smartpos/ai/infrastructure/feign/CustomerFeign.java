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

    @GetMapping("/api/v1/customers/{id}")
    Map<String, Object> getCustomer(@PathVariable UUID id);

    @GetMapping("/api/v1/customers")
    org.springframework.data.domain.Page<Map<String, Object>> searchCustomers(
        @RequestParam(required = false) String search,
        @RequestParam(required = false) Boolean active,
        org.springframework.data.domain.Pageable pageable);
}
