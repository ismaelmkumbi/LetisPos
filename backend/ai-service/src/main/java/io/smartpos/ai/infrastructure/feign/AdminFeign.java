package io.smartpos.ai.infrastructure.feign;

import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.Map;

@FeignClient(name = "auth-service",
    url = "${smartpos.ai.auth-service-url:http://localhost:8081}")
public interface AdminFeign {

    @GetMapping("/api/v1/tenants/admin/all")
    List<Map<String, Object>> listAllTenants();
}
