package io.smartpos.report.infrastructure.feign;

import feign.RequestInterceptor;
import io.smartpos.common.context.TenantContext;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;

import java.util.UUID;

@Configuration
public class FeignJwtForwarder {

    @Bean
    public RequestInterceptor jwtForwardingInterceptor() {
        return template -> {
            Object auth = SecurityContextHolder.getContext().getAuthentication();
            if (auth instanceof JwtAuthenticationToken jwtAuth) {
                template.header("Authorization", "Bearer " + jwtAuth.getToken().getTokenValue());
            }
            TenantContext.get().map(UUID::toString)
                    .ifPresent(tenantId -> template.header("X-Tenant-ID", tenantId));
            String cid = org.slf4j.MDC.get("traceId");
            if (cid != null) template.header("X-Correlation-Id", cid);
        };
    }
}
