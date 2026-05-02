package io.smartpos.user.api;

import io.smartpos.user.domain.model.UserProfile;
import io.smartpos.user.domain.repository.UserProfileRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Set;
import java.util.UUID;

/**
 * Service-to-service endpoints, reserved for backend callers that can't (or
 * shouldn't) hold an end-user JWT.
 *
 * Security model:
 *  - Paths live under {@code /api/internal/**}. User-service security config
 *    must mark this path as {@code permitAll()} for the JWT filter — the
 *    shared-secret check below is the only authentication required.
 *  - Callers prove identity with a single header {@code X-Internal-Token}
 *    whose value matches {@code smartpos.internal.shared-secret} on the
 *    server. The secret is the same across all services; rotating it is a
 *    coordinated restart.
 *  - Rotate by setting env var {@code SMARTPOS_INTERNAL_SHARED_SECRET} and
 *    restarting every service that talks internal-to-internal.
 *
 * The endpoint intentionally returns ONLY what the access-token issuer needs
 * — no PII beyond email. It's not a general-purpose profile read.
 */
@RestController
@RequestMapping("/api/internal/users")
@RequiredArgsConstructor
public class InternalUserController {

    private final UserProfileRepository userRepo;

    @Value("${smartpos.internal.shared-secret:change-me-dev-only}")
    private String expectedSecret;

    public record AuthClaims(
            UUID userId,
            String email,
            UUID tenantId,
            boolean isAllWarehouses,
            Set<UUID> warehouseIds,
            List<String> roles,
            List<String> permissions
    ) {}

    @GetMapping("/{id}/auth-claims")
    @Transactional(readOnly = true)
    public AuthClaims authClaims(@PathVariable UUID id,
                                 @RequestHeader(value = "X-Internal-Token", required = false) String token) {
        if (expectedSecret == null || expectedSecret.isBlank()
                || !expectedSecret.equals(token)) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid internal token");
        }

        UserProfile u = userRepo.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));

        List<String> roles = u.getRoles().stream().map(r -> r.getName()).toList();
        List<String> perms = u.getRoles().stream()
                .flatMap(r -> r.getPermissions().stream())
                .map(p -> p.getName())
                .distinct()
                .toList();

        return new AuthClaims(
                u.getId(), u.getEmail(), u.getTenantId(),
                u.isAllWarehouses(), u.getWarehouseIds(),
                roles, perms
        );
    }
}
