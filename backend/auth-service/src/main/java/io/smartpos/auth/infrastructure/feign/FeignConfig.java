package io.smartpos.auth.infrastructure.feign;

import feign.RequestInterceptor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Global Feign configuration — adds the X-Internal-Token header to every
 * outgoing Feign call so downstream services can authenticate service-to-service
 * requests without a JWT.
 */
@Configuration
public class FeignConfig {

    @Bean
    public RequestInterceptor internalTokenInterceptor(
            @Value("${smartpos.internal.shared-secret:dev-internal-token-change-me}") String secret) {
        return template -> {
            if (secret != null && !secret.isBlank()) {
                template.header("X-Internal-Token", secret);
            }
        };
    }
}
