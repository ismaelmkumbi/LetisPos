package io.smartpos.audit.infrastructure;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

@Component
@Slf4j
public class InternalAuthFilter extends OncePerRequestFilter {

    @Value("${smartpos.internal.shared-secret}")
    private String sharedSecret;

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {
        String path = request.getRequestURI();

        // Only enforce shared-secret on internal audit ingestion paths.
        // Admin read paths use JWT auth (handled by Spring Security).
        if (!path.startsWith("/api/v1/audit/")) {
            filterChain.doFilter(request, response);
            return;
        }

        String secret = request.getHeader("X-Internal-Secret");
        if (secret == null || !secret.equals(sharedSecret)) {
            response.setStatus(HttpStatus.UNAUTHORIZED.value());
            response.setContentType("application/json");
            response.getWriter().write("{\"error\":\"unauthorized\",\"message\":\"Invalid or missing internal secret\"}");
            return;
        }
        filterChain.doFilter(request, response);
    }
}
