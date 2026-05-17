package io.smartpos.report.infrastructure.feign;

import jakarta.annotation.PostConstruct;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;

import java.util.Map;

/**
 * Obtains a system-level JWT from the auth-service at startup.
 * Used by FeignJwtForwarder when no end-user SecurityContext exists
 * (e.g. @Scheduled freshness checks).
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

    @PostConstruct
    public void init() {
        refreshToken();
    }

    public String getToken() {
        if (token == null) refreshToken();
        return token;
    }

    private synchronized void refreshToken() {
        try {
            RestTemplate rt = new RestTemplate();
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            Map<String, String> body = Map.of("email", email, "password", password);
            HttpEntity<Map<String, String>> request = new HttpEntity<>(body, headers);
            ResponseEntity<Map> response = rt.postForEntity(authUrl, request, Map.class);
            if (response.getBody() != null && response.getBody().get("accessToken") != null) {
                token = (String) response.getBody().get("accessToken");
                log.info("System JWT obtained successfully");
            }
        } catch (Exception e) {
            log.warn("Failed to obtain system JWT: {}", e.getMessage());
        }
    }
}
