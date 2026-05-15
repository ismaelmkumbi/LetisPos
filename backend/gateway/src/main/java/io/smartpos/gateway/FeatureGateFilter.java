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
     * Report paths are handled separately via REPORT_GATES for finer granularity.
     */
    private static final LinkedHashMap<String, Integer> PLAN_GATES = new LinkedHashMap<>();
    static {
        // Business features — STARTER+
        PLAN_GATES.put("/api/v1/accounting/", planOrdinal("STARTER"));
        PLAN_GATES.put("/api/v1/purchases/", planOrdinal("STARTER"));
        PLAN_GATES.put("/api/v1/taxes/", planOrdinal("STARTER"));
        PLAN_GATES.put("/api/v1/deposits/", planOrdinal("STARTER"));
        PLAN_GATES.put("/api/v1/cash-management/", planOrdinal("STARTER"));
        PLAN_GATES.put("/api/v1/promotions/", planOrdinal("STARTER"));
        PLAN_GATES.put("/api/v1/coupons/", planOrdinal("STARTER"));
        PLAN_GATES.put("/api/v1/branches/", planOrdinal("STARTER"));
        PLAN_GATES.put("/api/v1/quotations/", planOrdinal("STARTER"));
        PLAN_GATES.put("/api/v1/documents/", planOrdinal("STARTER"));

        // AI features — STARTER+
        PLAN_GATES.put("/api/v1/ai/products/", planOrdinal("STARTER"));
        PLAN_GATES.put("/api/v1/ai/capture-sessions/", planOrdinal("STARTER"));
        PLAN_GATES.put("/api/v1/ai/reports/", planOrdinal("STARTER"));
        PLAN_GATES.put("/api/v1/ai/forecasting", planOrdinal("STARTER"));
        PLAN_GATES.put("/api/v1/ai/customer-analytics", planOrdinal("STARTER"));
        PLAN_GATES.put("/api/v1/ai/fraud-detection", planOrdinal("STARTER"));
        PLAN_GATES.put("/api/v1/ai/", planOrdinal("STARTER"));

        // Advanced features — PROFESSIONAL+
        PLAN_GATES.put("/api/v1/hrm/", planOrdinal("PROFESSIONAL"));
        PLAN_GATES.put("/api/v1/crm/", planOrdinal("PROFESSIONAL"));
        PLAN_GATES.put("/api/v1/integrations/", planOrdinal("PROFESSIONAL"));
        PLAN_GATES.put("/api/v1/admin/audit", planOrdinal("PROFESSIONAL"));
        PLAN_GATES.put("/api/v1/admin/api-keys", planOrdinal("PROFESSIONAL"));

        // Admin billing — STARTER+ (any paid plan)
        PLAN_GATES.put("/api/v1/billing/admin/", planOrdinal("STARTER"));
        PLAN_GATES.put("/api/v1/admin/", planOrdinal("STARTER"));
    }

    /**
     * Report-specific gating for graduated access:
     * - STARTER: /api/v1/reports/daily-summary, /api/v1/reports/stock-level,
     *            /api/v1/reports/sales, /api/v1/reports/customer
     * - BUSINESS: + /api/v1/reports/financial, /api/v1/reports/tax, /api/v1/reports/purchase,
     *             /api/v1/reports/supplier, /api/v1/reports/export
     * - PROFESSIONAL: + /api/v1/reports/employee, /api/v1/reports/analytics
     * - ENTERPRISE: + /api/v1/reports/custom, /api/v1/reports/scheduled
     *
     * Checked before the main PLAN_GATES map for finer granularity.
     */
    private static final LinkedHashMap<String, Integer> REPORT_GATES = new LinkedHashMap<>();
    static {
        REPORT_GATES.put("/api/v1/reports/financial", planOrdinal("STARTER"));
        REPORT_GATES.put("/api/v1/reports/tax", planOrdinal("STARTER"));
        REPORT_GATES.put("/api/v1/reports/purchase", planOrdinal("STARTER"));
        REPORT_GATES.put("/api/v1/reports/supplier", planOrdinal("STARTER"));
        REPORT_GATES.put("/api/v1/reports/export", planOrdinal("STARTER"));
        REPORT_GATES.put("/api/v1/reports/employee", planOrdinal("STARTER"));
        REPORT_GATES.put("/api/v1/reports/analytics", planOrdinal("STARTER"));
        REPORT_GATES.put("/api/v1/reports/custom", planOrdinal("ENTERPRISE"));
        REPORT_GATES.put("/api/v1/reports/scheduled", planOrdinal("ENTERPRISE"));
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
            "/api/v1/billing/plans",
            "/api/v1/billing/mpesa/callback"
    );

    @Override
    public Mono<Void> filter(ServerWebExchange exchange, GatewayFilterChain chain) {
        if (isPublicPath(exchange)) {
            return chain.filter(exchange);
        }

        String path = exchange.getRequest().getURI().getPath();

        // Check report-specific gates first (finer granularity), then fall back to main gates
        Map.Entry<String, Integer> gate = REPORT_GATES.entrySet().stream()
                .filter(e -> path.startsWith(e.getKey()))
                .findFirst()
                .orElse(null);

        if (gate == null) {
            gate = PLAN_GATES.entrySet().stream()
                    .filter(e -> path.startsWith(e.getKey()))
                    .findFirst()
                    .orElse(null);
        }

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
                    @SuppressWarnings("unchecked")
                    var roles = (java.util.List<String>) jwt.getClaims().get("roles");
                    if (roles != null && roles.contains("SUPER_ADMIN")) {
                        return chain.filter(exchange);
                    }

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
            case "STARTER" -> 1;
            case "BUSINESS" -> 2;
            case "PROFESSIONAL" -> 3;
            case "ENTERPRISE" -> 4;
            default -> 1;
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

        String body = String.format(
            "{\"error\":\"Plan upgrade required\"," +
            "\"message\":\"This feature requires the %s plan or higher. " +
            "Visit Billing to upgrade your plan and unlock this feature.\"," +
            "\"requiredPlan\":\"%s\"," +
            "\"upgradeUrl\":\"/smartpos/billing\"}",
            requiredPlan, requiredPlan);

        return response.writeWith(Mono.just(
                response.bufferFactory().wrap(body.getBytes())));
    }
}
