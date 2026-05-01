package io.smartpos.sales.infrastructure.feign;

import feign.RequestInterceptor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;

/**
 * Attaches the caller's JWT to every outgoing Feign request so the downstream
 * service (e.g. Inventory) can authorise it exactly as if the client called
 * it directly. The token is NOT re-issued or modified — just forwarded.
 *
 * This is what makes the permission model ("hasAuthority('sale.create')" →
 * "hasAuthority('stock.transfer')" depending on the path) work end-to-end.
 */
@Configuration
public class FeignJwtForwarder {

    @Bean
    public RequestInterceptor jwtForwardingInterceptor() {
        return template -> {
            Object auth = SecurityContextHolder.getContext().getAuthentication();
            if (auth instanceof JwtAuthenticationToken jwtAuth) {
                Jwt jwt = jwtAuth.getToken();
                template.header("Authorization", "Bearer " + jwt.getTokenValue());
            }
            // Propagate correlation id if present
            String cid = org.slf4j.MDC.get("traceId");
            if (cid != null) template.header("X-Correlation-Id", cid);
        };
    }
}
