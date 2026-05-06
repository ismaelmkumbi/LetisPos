package io.smartpos.gateway;

import org.springframework.cloud.gateway.filter.GatewayFilterChain;
import org.springframework.cloud.gateway.filter.GlobalFilter;
import org.springframework.core.Ordered;
import org.springframework.http.server.reactive.ServerHttpRequest;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.ReactiveSecurityContextHolder;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ServerWebExchange;
import reactor.core.publisher.Mono;

/**
 * Extracts the {@code tenantId} claim from the JWT and injects an
 * {@code X-Tenant-ID} header on the proxied request so downstream
 * services can apply tenant-scoped queries without re-parsing the JWT.
 */
@Component
public class TenantHeaderFilter implements GlobalFilter, Ordered {

    @Override
    public Mono<Void> filter(ServerWebExchange exchange, GatewayFilterChain chain) {
        return ReactiveSecurityContextHolder.getContext()
                .map(SecurityContext::getAuthentication)
                .map(Authentication::getPrincipal)
                .filter(principal -> principal instanceof Jwt)
                .cast(Jwt.class)
                .map(jwt -> {
                    String tenantId = jwt.getClaimAsString("tenantId");
                    if (tenantId != null && !tenantId.isBlank()) {
                        ServerHttpRequest mutated = exchange.getRequest().mutate()
                                .headers(headers -> {
                                    headers.remove("X-Tenant-ID");
                                    headers.set("X-Tenant-ID", tenantId);
                                })
                                .build();
                        return exchange.mutate().request(mutated).build();
                    }
                    return exchange;
                })
                .defaultIfEmpty(exchange)
                .flatMap(e -> chain.filter(e));
    }

    @Override
    public int getOrder() {
        // Run after security (which is at -100) so the JWT is already authenticated
        return -50;
    }
}
