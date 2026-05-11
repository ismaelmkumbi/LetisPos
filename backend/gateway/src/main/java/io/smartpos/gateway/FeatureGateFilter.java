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

import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Set;

/**
 * Blocks requests to gated API endpoints when the tenant's billing plan is
 * below the required minimum plan for that feature area.
 *
 * Runs after {@link TenantStatusFilter} (order -40) so blocked accounts are
 * already rejected before we check feature access.
 */
@Component
public class FeatureGateFilter implements GlobalFilter, Ordered {

    /**
     * Endpoint path prefixes that require a minimum billing plan.
     * Order matters — more specific prefixes should come first.
     */
    private static final LinkedHashMap<String, Integer> PLAN_GATES = new LinkedHashMap<>();
    static {
        // HRM: Professional+
        PLAN_GATES.put("/api/v1/hrm/", planOrdinal("PROFESSIONAL"));
        // Billing admin (plan management, admin invoices): any paid plan
        PLAN_GATES.put("/api/v1/billing/admin/", planOrdinal("STARTER"));
        // Integrations / API Keys: Professional+
        PLAN_GATES.put("/api/v1/integrations/", planOrdinal("PROFESSIONAL"));
    }

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
            "/api/v1/billing/plans"
    );

    @Override
    public Mono<Void> filter(ServerWebExchange exchange, GatewayFilterChain chain) {
        if (isPublicPath(exchange)) {
            return chain.filter(exchange);
        }

        String path = exchange.getRequest().getURI().getPath();

        // Check if this path matches any gated prefix
        Map.Entry<String, Integer> gate = PLAN_GATES.entrySet().stream()
                .filter(e -> path.startsWith(e.getKey()))
                .findFirst()
                .orElse(null);

        if (gate == null) {
            // No gate applies — allow through
            return chain.filter(exchange);
        }

        int requiredPlan = gate.getValue();
        String requiredPlanName = ordinalToName(requiredPlan);

        return ReactiveSecurityContextHolder.getContext()
                .map(SecurityContext::getAuthentication)
                .map(Authentication::getPrincipal)
                .filter(principal -> principal instanceof Jwt)
                .cast(Jwt.class)
                .flatMap(jwt -> {
                    String billingPlanClaim = jwt.getClaimAsString("billingPlan");

                    if (billingPlanClaim == null) {
                        // No billingPlan claim — allow through (backwards compat)
                        return chain.filter(exchange);
                    }

                    int currentPlan = planOrdinal(billingPlanClaim);

                    if (currentPlan < requiredPlan) {
                        return paymentRequired(exchange, requiredPlanName);
                    }

                    return chain.filter(exchange);
                })
                .switchIfEmpty(Mono.defer(() -> chain.filter(exchange)));
    }

    @Override
    public int getOrder() {
        // After TenantStatusFilter (-40), before downstream routing
        return -30;
    }

    private boolean isPublicPath(ServerWebExchange exchange) {
        String path = exchange.getRequest().getURI().getPath();
        if ("OPTIONS".equalsIgnoreCase(exchange.getRequest().getMethod().name())) {
            return true;
        }
        if (path.startsWith("/api/v1/ai/capture-sessions/")) {
            return true;
        }
        return PUBLIC_PREFIXES.stream().anyMatch(path::startsWith);
    }

    /**
     * Converts a plan name to its ordinal for comparison.
     * Higher ordinals mean more features / higher-tier plans.
     */
    private static int planOrdinal(String planName) {
        if (planName == null) return 0;
        return switch (planName.toUpperCase()) {
            case "FREE" -> 0;
            case "STARTER" -> 1;
            case "BUSINESS" -> 2;
            case "PROFESSIONAL" -> 3;
            case "ENTERPRISE" -> 4;
            default -> 0;
        };
    }

    private static String ordinalToName(int ordinal) {
        return switch (ordinal) {
            case 1 -> "STARTER";
            case 2 -> "BUSINESS";
            case 3 -> "PROFESSIONAL";
            case 4 -> "ENTERPRISE";
            default -> "STARTER";
        };
    }

    private Mono<Void> paymentRequired(ServerWebExchange exchange, String requiredPlan) {
        var response = exchange.getResponse();
        response.setStatusCode(HttpStatus.PAYMENT_REQUIRED);
        response.getHeaders().setContentType(MediaType.APPLICATION_JSON);
        String body = "{\"error\":\"Feature not available\",\"message\":\"Upgrade to "
                + requiredPlan + " to access this feature.\",\"requiredPlan\":\""
                + requiredPlan + "\"}";
        return response.writeWith(Mono.just(
                response.bufferFactory().wrap(body.getBytes())));
    }
}
