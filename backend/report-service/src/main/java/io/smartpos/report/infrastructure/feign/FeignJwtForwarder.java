package io.smartpos.report.infrastructure.feign;

import feign.RequestInterceptor;
import io.smartpos.common.context.TenantContext;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;

import java.util.UUID;

@Configuration
@RequiredArgsConstructor
public class FeignJwtForwarder {

    private final SystemJwtProvider systemJwt;

    @Bean
    public RequestInterceptor jwtForwardingInterceptor() {
        return template -> {
            // Forward the end-user's JWT if present (from an incoming HTTP request)
            Object auth = SecurityContextHolder.getContext().getAuthentication();
            if (auth instanceof JwtAuthenticationToken jwtAuth) {
                template.header("Authorization", "Bearer " + jwtAuth.getToken().getTokenValue());
            } else {
                // No user context — use system JWT (e.g. @Scheduled freshness checks)
                String sysToken = systemJwt.getToken();
                if (sysToken != null) {
                    template.header("Authorization", "Bearer " + sysToken);
                }
            }
            String tenantId = TenantContext.get().map(UUID::toString).orElse(null);
            if (tenantId != null) {
                template.header("X-Tenant-ID", tenantId);
            } else {
                // Fallback: use the system user's tenant for scheduled/background tasks
                String systemTid = systemJwt.getSystemTenantId();
                if (systemTid != null && !systemTid.isBlank()) {
                    template.header("X-Tenant-ID", systemTid);
                }
            }
            String cid = org.slf4j.MDC.get("traceId");
            if (cid != null) template.header("X-Correlation-Id", cid);
        };
    }
}
