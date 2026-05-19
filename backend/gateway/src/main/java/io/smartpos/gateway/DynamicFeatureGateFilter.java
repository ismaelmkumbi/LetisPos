package io.smartpos.gateway;

import org.springframework.cloud.gateway.filter.GatewayFilterChain;
import org.springframework.cloud.gateway.filter.GlobalFilter;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.http.HttpStatus;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Component;
import org.springframework.util.AntPathMatcher;
import org.springframework.web.server.ServerWebExchange;
import reactor.core.publisher.Mono;

import java.util.List;

@Component
@Order(-30)
public class DynamicFeatureGateFilter implements GlobalFilter, Ordered {

    private final PathMappingCache pathMappingCache;
    private final AntPathMatcher pathMatcher = new AntPathMatcher();

    public DynamicFeatureGateFilter(PathMappingCache pathMappingCache) {
        this.pathMappingCache = pathMappingCache;
    }

    @Override
    public Mono<Void> filter(ServerWebExchange exchange, GatewayFilterChain chain) {
        String path = exchange.getRequest().getURI().getPath();

        if (isPublicPath(path)) {
            return chain.filter(exchange);
        }

        PathMappingCache.PathMapping matched = pathMappingCache.getMappings().stream()
            .filter(m -> pathMatcher.match(m.getPathPattern(), path))
            .findFirst()
            .orElse(null);

        if (matched == null) {
            return chain.filter(exchange);
        }

        return exchange.getPrincipal()
            .filter(p -> p instanceof Jwt)
            .map(p -> (Jwt) p)
            .flatMap(jwt -> {
                if (isSuperAdmin(jwt)) {
                    return chain.filter(exchange);
                }
                List<String> features = getFeatures(jwt);
                if (features.contains(matched.getRequiredFeatureKey())) {
                    return chain.filter(exchange);
                }
                exchange.getResponse().setStatusCode(
                    HttpStatus.valueOf(matched.getHttpStatusOnDeny()));
                exchange.getResponse().getHeaders()
                    .add("X-Upgrade-Required", "true");
                exchange.getResponse().getHeaders()
                    .add("X-Required-Feature", matched.getRequiredFeatureKey());
                return exchange.getResponse().setComplete();
            })
            .switchIfEmpty(chain.filter(exchange));
    }

    @Override
    public int getOrder() {
        return -30;
    }

    private boolean isPublicPath(String path) {
        return path.startsWith("/api/v1/auth/")
            || path.startsWith("/api/v1/billing/plans")
            || path.startsWith("/api/v1/webhooks/")
            || path.startsWith("/.well-known/")
            || path.startsWith("/actuator/");
    }

    @SuppressWarnings("unchecked")
    private List<String> getFeatures(Jwt jwt) {
        try {
            Object obj = jwt.getClaims().get("features");
            if (obj instanceof List<?> list) {
                return (List<String>) list;
            }
        } catch (Exception e) {
            // Features claim missing or malformed, deny implicitly by returning empty
        }
        return List.of();
    }

    private boolean isSuperAdmin(Jwt jwt) {
        try {
            Object obj = jwt.getClaims().get("roles");
            if (obj instanceof List<?> roles) {
                return roles.contains("SUPER_ADMIN");
            }
        } catch (Exception e) { /* ignore */ }
        return false;
    }
}
