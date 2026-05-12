package io.smartpos.gateway;

import org.springframework.cloud.gateway.filter.GatewayFilterChain;
import org.springframework.cloud.gateway.filter.GlobalFilter;
import org.springframework.core.Ordered;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.ReactiveSecurityContextHolder;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ServerWebExchange;
import reactor.core.publisher.Mono;

import java.util.Set;

/**
 * Blocks requests from tenants whose status is {@code SUSPENDED} or {@code CLOSED},
 * and adds a warning header for {@code PAST_DUE} tenants.
 *
 * Runs after {@link TenantHeaderFilter} (order -50) and before downstream routing,
 * so the tenant identity is already available from the JWT.
 */
@Component
public class TenantStatusFilter implements GlobalFilter, Ordered {

    private static final Set<String> PUBLIC_PREFIXES = Set.of(
            "/api/v1/auth/login",
            "/api/v1/auth/refresh",
            "/api/v1/auth/logout",
            "/api/v1/auth/register",
            "/api/v1/auth/password",
            "/api/v1/payments/stripe/webhook",
            "/webhooks",
            "/.well-known",
            "/actuator",
            "/api/v1/billing/plans",
            "/api/v1/billing/subscriptions",
            "/api/v1/billing/mpesa",
            "/api/v1/billing/payment-methods",
            "/api/v1/billing/invoices",
            "/api/v1/billing/webhooks"
    );

    @Override
    public Mono<Void> filter(ServerWebExchange exchange, GatewayFilterChain chain) {
        // Skip public paths — no JWT is required for these
        if (isPublicPath(exchange)) {
            return chain.filter(exchange);
        }

        return ReactiveSecurityContextHolder.getContext()
                .map(SecurityContext::getAuthentication)
                .map(Authentication::getPrincipal)
                .filter(principal -> principal instanceof Jwt)
                .cast(Jwt.class)
                .flatMap(jwt -> {
                    String status = jwt.getClaimAsString("tenantStatus");

                    if (status == null) {
                        // No tenantStatus claim — allow through (backwards compat)
                        return chain.filter(exchange);
                    }

                    if ("SUSPENDED".equals(status) || "CLOSED".equals(status) || "TRIAL_EXPIRED".equals(status)) {
                        String message = "TRIAL_EXPIRED".equals(status)
                            ? "Your free trial has ended. Please subscribe to continue using Letis POS."
                            : "Your account has been suspended. Please contact support.";
                        return forbidden(exchange, "Account " + status.toLowerCase(), message);
                    }

                    if ("PAST_DUE".equals(status)) {
                        exchange.getResponse().getHeaders().set("X-Account-Status", "past_due");
                    }

                    return chain.filter(exchange);
                })
                .switchIfEmpty(Mono.defer(() -> chain.filter(exchange)));
    }

    @Override
    public int getOrder() {
        // After TenantHeaderFilter (-50), before downstream routing
        return -40;
    }

    private boolean isPublicPath(ServerWebExchange exchange) {
        String path = exchange.getRequest().getURI().getPath();
        // OPTIONS preflight requests are always public
        if ("OPTIONS".equalsIgnoreCase(exchange.getRequest().getMethod().name())) {
            return true;
        }
        // AI capture sessions are session-token authenticated, not JWT
        if (path.startsWith("/api/v1/ai/capture-sessions/")) {
            return true;
        }
        return PUBLIC_PREFIXES.stream().anyMatch(path::startsWith);
    }

    private Mono<Void> forbidden(ServerWebExchange exchange, String error, String message) {
        var response = exchange.getResponse();
        response.setStatusCode(HttpStatus.FORBIDDEN);
        response.getHeaders().setContentType(MediaType.APPLICATION_JSON);
        String body = "{\"error\":\"" + error + "\",\"message\":\"" + message + "\"}";
        return response.writeWith(Mono.just(
                response.bufferFactory().wrap(body.getBytes())));
    }
}
