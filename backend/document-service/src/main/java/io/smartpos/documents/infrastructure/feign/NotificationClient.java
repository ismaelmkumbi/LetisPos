package io.smartpos.documents.infrastructure.feign;

import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import java.util.Map;

@FeignClient(name = "notification-service", url = "${spring.cloud.openfeign.client.config.notification-service.url}")
public interface NotificationClient {
    @PostMapping("/api/v1/notifications")
    Map<String, Object> send(@RequestBody Map<String, Object> request);
}
