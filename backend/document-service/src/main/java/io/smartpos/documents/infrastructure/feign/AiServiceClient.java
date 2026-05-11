package io.smartpos.documents.infrastructure.feign;

import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import java.util.Map;

@FeignClient(name = "ai-service", url = "${spring.cloud.openfeign.client.config.ai-service.url}")
public interface AiServiceClient {

    @PostMapping("/api/v1/ai/narrate")
    Map<String, Object> narrate(@RequestBody Map<String, Object> request);

    @PostMapping("/api/v1/ai/reports/anomalies")
    Map<String, Object> detectAnomalies(@RequestBody Map<String, Object> request);

    @PostMapping("/api/v1/ai/chat")
    Map<String, Object> chat(@RequestBody Map<String, Object> request);
}
