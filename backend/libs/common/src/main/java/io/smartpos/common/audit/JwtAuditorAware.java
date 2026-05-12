package io.smartpos.common.audit;

import org.springframework.data.domain.AuditorAware;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;

import java.util.Optional;

/**
 * Resolves the current auditor (user) from the JWT in the SecurityContext.
 *
 * Extracts the preferred username from the JWT {@code sub} claim (userId).
 * Each service registers this as a {@code @Bean} named {@code auditorAware}
 * and enables auditing with {@code @EnableJpaAuditing(auditorAwareRef = "auditorAware")}.
 */
public class JwtAuditorAware implements AuditorAware<String> {

    @Override
    public Optional<String> getCurrentAuditor() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated()) {
            return Optional.empty();
        }

        Object principal = authentication.getPrincipal();
        if (principal instanceof Jwt jwt) {
            String email = jwt.getClaimAsString("email");
            String sub = jwt.getClaimAsString("sub");
            if (email != null) return Optional.of(email);
            if (sub != null) return Optional.of(sub);
        }

        if (principal instanceof String str) {
            return Optional.of(str);
        }

        return Optional.of("system");
    }
}
