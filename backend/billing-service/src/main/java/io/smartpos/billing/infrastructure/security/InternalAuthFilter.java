package io.smartpos.billing.infrastructure.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.List;

/**
 * Allows service-to-service calls (e.g. auth-service creating subscriptions)
 * to bypass JWT auth by sending the {@code X-Internal-Token} header.
 * Sets a synthetic authentication with {@code billing.manage} authority so
 * {@code @PreAuthorize} passes on internal endpoints.
 */
@Component
@Slf4j
public class InternalAuthFilter extends OncePerRequestFilter {

    @Value("${smartpos.internal.shared-secret:dev-internal-token-change-me}")
    private String sharedSecret;

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response,
                                    FilterChain chain) throws ServletException, IOException {
        String token = request.getHeader("X-Internal-Token");
        if (token != null && !token.isBlank() && token.equals(sharedSecret)) {
            SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken("internal-service", null,
                    List.of(new SimpleGrantedAuthority("billing.manage")))
            );
        }
        chain.doFilter(request, response);
    }
}
