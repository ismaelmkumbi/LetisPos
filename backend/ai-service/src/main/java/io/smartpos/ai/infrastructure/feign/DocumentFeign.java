package io.smartpos.ai.infrastructure.feign;

import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.*;
import java.util.Map;
import java.util.UUID;

@FeignClient(name = "document-service",
    url = "${smartpos.ai.document-service-url:http://localhost:8093}")
public interface DocumentFeign {

    @GetMapping("/api/v1/documents")
    Map<String, Object> search(
        @RequestParam(required = false) String documentType,
        @RequestParam(required = false) String status,
        @RequestParam(required = false, defaultValue = "0") int page,
        @RequestParam(required = false, defaultValue = "25") int size);

    @PostMapping("/api/v1/documents/{id}/email")
    Map<String, String> emailDocument(@PathVariable UUID id, @RequestBody Map<String, Object> body);
}
