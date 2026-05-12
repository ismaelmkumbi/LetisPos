package io.smartpos.billing.infrastructure.feign;

import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;

import java.util.Map;

@FeignClient(name = "notification-service", url = "${notification-service.url:http://localhost:8089}")
public interface NotificationClient {

    @PostMapping("/api/v1/notifications/internal/send")
    Map<String, Object> send(@RequestBody Map<String, Object> request);
}
