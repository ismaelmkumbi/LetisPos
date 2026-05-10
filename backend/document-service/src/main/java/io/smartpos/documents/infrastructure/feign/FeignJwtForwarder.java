package io.smartpos.documents.infrastructure.feign;

import feign.RequestInterceptor;
import org.slf4j.MDC;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.security.oauth2.jwt.Jwt;

@Configuration
public class FeignJwtForwarder {
    @Bean
    public RequestInterceptor jwtForwardingInterceptor() {
        return template -> {
            var auth = SecurityContextHolder.getContext().getAuthentication();
            if (auth instanceof JwtAuthenticationToken jwtAuth) {
                Jwt jwt = jwtAuth.getToken();
                template.header("Authorization", "Bearer " + jwt.getTokenValue());
            }
            String correlationId = MDC.get("X-Correlation-Id");
            if (correlationId != null) {
                template.header("X-Correlation-Id", correlationId);
            }
        };
    }
}
