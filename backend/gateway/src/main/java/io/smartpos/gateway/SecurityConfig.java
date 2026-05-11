package io.smartpos.gateway;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.web.reactive.EnableWebFluxSecurity;
import org.springframework.security.config.web.server.ServerHttpSecurity;
import org.springframework.security.web.server.SecurityWebFilterChain;

/**
 * Gateway security:
 *  - Login/refresh/register/JWKS endpoints are public.
 *  - Everything else requires a valid JWT (verified against Auth's JWKS).
 *  - Fine-grained @PreAuthorize lives in each downstream service.
 */
@Configuration
@EnableWebFluxSecurity
public class SecurityConfig {

    @Bean
    public SecurityWebFilterChain springSecurityFilterChain(ServerHttpSecurity http) {
        return http
                .csrf(c -> c.disable())
                .cors(cors -> { /* handled by gateway.globalcors in application.yml */ })
                .authorizeExchange(r -> r
                        // CORS preflights must never require auth — browsers send them
                        // before the real request and without the Authorization header.
                        .pathMatchers(HttpMethod.OPTIONS, "/**").permitAll()
                        .pathMatchers(HttpMethod.POST,
                                "/api/v1/ai/capture-sessions/*/photos",
                                "/api/v1/ai/capture-sessions/*/complete"
                        ).permitAll()
                        .pathMatchers(HttpMethod.GET,
                                "/api/v1/ai/capture-sessions/*/photos",
                                "/api/v1/ai/capture-sessions/*/photos/*/full",
                                "/api/v1/ai/capture-sessions/*/photos/*/thumb"
                        ).permitAll()
                        .pathMatchers(
                                "/api/v1/auth/login",
                                "/api/v1/auth/refresh",
                                "/api/v1/auth/logout",
                                "/api/v1/auth/register",
                                "/api/v1/auth/password/**",
                                "/api/v1/payments/stripe/webhook",
                                "/webhooks/**",
                                "/.well-known/jwks.json",
                                "/actuator/**"
                        ).permitAll()
                        .anyExchange().authenticated())
                .oauth2ResourceServer(o -> o.jwt(org.springframework.security.config.Customizer.withDefaults()))
                .build();
    }
}
