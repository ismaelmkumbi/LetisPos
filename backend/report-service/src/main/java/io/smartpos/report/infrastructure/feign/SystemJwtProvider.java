package io.smartpos.report.infrastructure.feign;

import jakarta.annotation.PostConstruct;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;

import java.time.Instant;
import java.util.Map;
import java.util.concurrent.TimeUnit;

/**
 * Obtains a system-level JWT from the auth-service and keeps it fresh.
 * Used by FeignJwtForwarder when no end-user SecurityContext exists
 * (e.g. @Scheduled freshness checks or @PostConstruct cache warming).
 *
 * Retries on startup with backoff so transient auth-service unavailability
 * doesn't permanently break inter-service communication.
 */
@Slf4j
@Component
public class SystemJwtProvider {

    @Value("${smartpos.report.system-auth.email:admin@smartpos.local}")
    private String email;

    @Value("${smartpos.report.system-auth.password:Admin@12345}")
    private String password;

    @Value("${smartpos.report.system-auth.auth-url:http://localhost:8081/api/v1/auth/login}")
    private String authUrl;

    private volatile String token;
    private volatile Instant lastRefresh;
    private volatile String systemTenantId;

    @PostConstruct
    public void init() {
        refreshWithRetry();
    }

    public String getToken() {
        if (token == null || isExpiringSoon()) {
            refreshToken();
        }
        return token;
    }

    /** Returns the tenant ID associated with the system user, for use as fallback in scheduled tasks. */
    public String getSystemTenantId() {
        if (token == null || isExpiringSoon()) {
            refreshToken();
        }
        return systemTenantId;
    }

    private boolean isExpiringSoon() {
        // JWT tokens last ~1h; refresh after 50 min
        return lastRefresh != null
            && Instant.now().isAfter(lastRefresh.plusSeconds(3000));
    }

    /**
     * Startup retry: auth-service may not be ready yet when this service boots.
     * Retry up to 10 times with 3-second backoff.
     */
    private void refreshWithRetry() {
        for (int attempt = 1; attempt <= 10; attempt++) {
            if (refreshToken()) {
                log.info("System JWT obtained on attempt {}", attempt);
                return;
            }
            if (attempt < 10) {
                try {
                    TimeUnit.SECONDS.sleep(3);
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                    break;
                }
            }
        }
        log.error("Failed to obtain system JWT after 10 attempts — inter-service calls will fail until auth-service is reachable");
    }

    /**
     * Periodic refresh (every 50 min) to keep the token valid.
     */
    @Scheduled(fixedRate = 50, timeUnit = TimeUnit.MINUTES)
    public synchronized void scheduledRefresh() {
        if (!refreshToken()) {
            log.warn("Scheduled system JWT refresh failed — will retry on next cycle");
        }
    }

    private synchronized boolean refreshToken() {
        try {
            RestTemplate rt = new RestTemplate();
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            Map<String, String> body = Map.of("email", email, "password", password);
            HttpEntity<Map<String, String>> request = new HttpEntity<>(body, headers);
            ResponseEntity<Map> response = rt.postForEntity(authUrl, request, Map.class);
            if (response.getBody() != null && response.getBody().get("accessToken") != null) {
                token = (String) response.getBody().get("accessToken");
                lastRefresh = Instant.now();
                // Extract tenant ID from the user object in the login response
                Object userObj = response.getBody().get("user");
                if (userObj instanceof Map<?,?> user) {
                    Object tid = user.get("tenantId");
                    if (tid != null && !tid.toString().isBlank()) {
                        systemTenantId = tid.toString();
                        log.info("System JWT obtained with tenantId={}", systemTenantId);
                    }
                }
                return true;
            }
        } catch (Exception e) {
            log.warn("Failed to obtain system JWT ({}): {}", authUrl, e.getMessage());
        }
        return false;
    }
}
