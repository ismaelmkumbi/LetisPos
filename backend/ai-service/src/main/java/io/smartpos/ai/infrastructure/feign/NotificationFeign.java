package io.smartpos.ai.infrastructure.feign;

import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.Map;

@FeignClient(name = "notification-service",
    url = "${smartpos.ai.notification-service-url:http://localhost:8089}")
public interface NotificationFeign {

    @PostMapping("/api/v1/notifications")
    Map<String, Object> send(@RequestBody Map<String, Object> body);

    @GetMapping("/api/v1/notification-templates")
    List<Map<String, Object>> listTemplates(
        @RequestParam(required = false) String code,
        @RequestParam(required = false) String channel);
}
