package io.smartpos.ai.infrastructure.feign;

import org.springframework.cloud.openfeign.FeignClient;

@FeignClient(name = "customer-service",
    url = "${smartpos.ai.customer-service-url:http://localhost:8085}")
public interface CustomerFeign {
    // Placeholder — customer data comes via SalesFeign for now
}
