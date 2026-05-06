package io.smartpos.common.context;

import jakarta.servlet.Filter;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.ServletRequest;
import jakarta.servlet.ServletResponse;
import jakarta.servlet.http.HttpServletRequest;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;

import java.io.IOException;
import java.util.UUID;

/**
 * Extracts the tenant ID from the signed JWT {@code tenantId} claim first.
 * The {@code X-Tenant-ID} header is accepted only when no JWT tenant is
 * available, so a browser cannot override the tenant in its access token.
 * Stores the value in {@link TenantContext} for the duration of the request.
 */
@Slf4j
@Order(Ordered.LOWEST_PRECEDENCE - 10)
public class TenantContextFilter implements Filter {

    @Override
    public void doFilter(ServletRequest request, ServletResponse response,
                         FilterChain chain) throws IOException, ServletException {
        HttpServletRequest httpReq = (HttpServletRequest) request;
        String path = httpReq.getRequestURI();

        // Skip public endpoints
        if (path.startsWith("/api/v1/auth/login")
                || path.startsWith("/api/v1/auth/register")
                || path.startsWith("/api/v1/auth/refresh")
                || path.startsWith("/.well-known/")
                || path.startsWith("/actuator")) {
            chain.doFilter(request, response);
            return;
        }

        try {
            UUID tokenTenantId = extractFromJwt();
            UUID headerTenantId = extractFromHeader(httpReq);
            UUID tenantId = tokenTenantId != null ? tokenTenantId : headerTenantId;
            if (tokenTenantId != null && headerTenantId != null && !tokenTenantId.equals(headerTenantId)) {
                log.warn("Ignoring mismatched X-Tenant-ID header. tokenTenantId={} headerTenantId={}",
                        tokenTenantId, headerTenantId);
            }
            if (tenantId != null) {
                TenantContext.set(tenantId);
            }
            chain.doFilter(request, response);
        } finally {
            TenantContext.clear();
        }
    }

    private UUID extractFromHeader(HttpServletRequest request) {
        String header = request.getHeader("X-Tenant-ID");
        if (header != null && !header.isBlank()) {
            try {
                return UUID.fromString(header);
            } catch (IllegalArgumentException e) {
                log.debug("Invalid X-Tenant-ID header: {}", header);
            }
        }
        return null;
    }

    private UUID extractFromJwt() {
        try {
            Authentication auth = SecurityContextHolder.getContext().getAuthentication();
            if (auth != null && auth.getPrincipal() instanceof Jwt jwt) {
                String tenantId = jwt.getClaimAsString("tenantId");
                if (tenantId != null && !tenantId.isBlank()) {
                    return UUID.fromString(tenantId);
                }
            }
        } catch (Exception e) {
            log.debug("Could not extract tenantId from JWT: {}", e.getMessage());
        }
        return null;
    }
}
