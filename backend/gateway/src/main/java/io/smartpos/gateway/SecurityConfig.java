package io.smartpos.gateway;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.web.reactive.EnableWebFluxSecurity;
import org.springframework.security.config.web.server.ServerHttpSecurity;
import org.springframework.security.web.server.SecurityWebFilterChain;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.reactive.CorsConfigurationSource;
import org.springframework.web.cors.reactive.UrlBasedCorsConfigurationSource;

import java.util.List;

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
                .cors(cors -> cors.configurationSource(corsConfigurationSource()))
                .authorizeExchange(r -> r
                        // CORS preflights must never require auth — browsers send them
                        // before the real request and without the Authorization header.
                        .pathMatchers(HttpMethod.OPTIONS, "/**").permitAll()
                        // Phone-side capture endpoints are session-token authenticated
                        // by the ai-service itself; the gateway must let them through
                        // without a JWT. Use the broadest matcher we can to avoid any
                        // path-pattern subtlety where one of the more specific patterns
                        // gets swallowed by the matcher set.
                        // Phone-only routes — token-authenticated by ai-service (no JWT).
                        .pathMatchers(HttpMethod.POST, "/api/v1/ai/capture-sessions/**").permitAll()
                        .pathMatchers(HttpMethod.GET,  "/api/v1/ai/capture-sessions/**").permitAll()
                        .pathMatchers(
                                "/api/v1/auth/login",
                                "/api/v1/auth/refresh",
                                "/api/v1/auth/logout",
                                "/api/v1/auth/register",
                                "/api/v1/auth/password/**",
                                "/api/v1/billing/plans",
                                "/api/v1/support/demo-requests",
                                "/api/v1/payments/stripe/webhook",
                                "/webhooks/**",
                                "/.well-known/jwks.json",
                                "/actuator/**"
                        ).permitAll()
                        .anyExchange().authenticated())
                .oauth2ResourceServer(o -> o.jwt(org.springframework.security.config.Customizer.withDefaults()))
                .build();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration config = new CorsConfiguration();
        config.setAllowedOriginPatterns(List.of(
            "http://localhost:*",
            "http://127.0.0.1:*",
            "https://*.smartpos.io",
            "https://*.letispos.com",
            "https://letispos.com"
        ));
        config.setAllowedMethods(List.of("*"));
        config.setAllowedHeaders(List.of("Authorization", "Content-Type", "X-Tenant-ID", "X-Requested-With", "X-Capture-Token"));
        config.setAllowCredentials(true);
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);
        return source;
    }
}
