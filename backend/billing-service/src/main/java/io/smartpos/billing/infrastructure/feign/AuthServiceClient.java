package io.smartpos.billing.infrastructure.feign;

import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;

import java.util.Map;
import java.util.UUID;

@FeignClient(name = "auth-service", url = "${smartpos.auth-service.base-url:http://localhost:8081}")
public interface AuthServiceClient {

    @PatchMapping("/api/v1/tenants/{id}")
    Map<String, Object> updateTenant(@PathVariable UUID id, @RequestBody Map<String, Object> body);
}
