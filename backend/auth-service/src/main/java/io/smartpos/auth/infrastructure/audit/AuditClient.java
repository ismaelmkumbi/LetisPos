package io.smartpos.auth.infrastructure.audit;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;

import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;

@Component
@RequiredArgsConstructor
@Slf4j
public class AuditClient {

    private final RestTemplate restTemplate = new RestTemplate();

    @Value("${smartpos.audit-service.base-url:http://localhost:8095}")
    private String auditServiceUrl;

    @Value("${smartpos.internal.shared-secret}")
    private String sharedSecret;

    @Async
    public void send(String service, UUID actorId, String actorName, String actorRole,
                     String action, String targetType, String targetId, String targetLabel,
                     UUID tenantId, Map<String, Object> diff) {
        try {
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.set("X-Internal-Secret", sharedSecret);

            Map<String, Object> event = new LinkedHashMap<>();
            event.put("id", UUID.randomUUID());
            event.put("timestamp", Instant.now().toString());
            event.put("service", service);
            event.put("actorId", actorId != null ? actorId.toString() : null);
            event.put("actorName", actorName);
            event.put("actorRole", actorRole);
            event.put("action", action);
            event.put("targetType", targetType);
            event.put("targetId", targetId);
            event.put("targetLabel", targetLabel);
            event.put("tenantId", tenantId.toString());
            event.put("diff", diff);

            HttpEntity<Map<String, Object>> request = new HttpEntity<>(event, headers);
            restTemplate.postForEntity(auditServiceUrl + "/api/v1/audit/events", request, Void.class);
        } catch (Exception e) {
            log.warn("Failed to send audit event: action={}, target={}", action, targetId, e);
        }
    }
}
