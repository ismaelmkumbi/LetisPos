package io.smartpos.billing.infrastructure.feign;

import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;

import java.util.Map;

@FeignClient(name = "document-service", url = "${document-service.url:http://localhost:8093}")
public interface DocumentFeign {

    @PostMapping("/api/v1/documents/generate")
    Map<String, Object> generateDocument(@RequestBody Map<String, Object> request);
}
