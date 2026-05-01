package io.smartpos.ai.infrastructure.feign;

import feign.RequestInterceptor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;

/**
 * Propagates the caller's bearer token on every Feign call so downstream
 * services (e.g. report-service) can authenticate the same user.
 *
 * Mirrors the equivalent forwarder in report-service / sales-service.
 */
@Configuration
public class FeignJwtForwarder {

    @Bean
    public RequestInterceptor jwtForwardingInterceptor() {
        return template -> {
            Object auth = SecurityContextHolder.getContext().getAuthentication();
            if (auth instanceof JwtAuthenticationToken jwtAuth) {
                template.header("Authorization", "Bearer " + jwtAuth.getToken().getTokenValue());
            }
            String cid = org.slf4j.MDC.get("traceId");
            if (cid != null) template.header("X-Correlation-Id", cid);
        };
    }
}
