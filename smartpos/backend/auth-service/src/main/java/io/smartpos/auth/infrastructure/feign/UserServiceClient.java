package io.smartpos.auth.infrastructure.feign;

import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;

import java.util.List;
import java.util.Set;
import java.util.UUID;

/**
 * Calls user-service's {@code /api/internal/users/{id}/auth-claims} to hydrate
 * a user's roles + permissions + warehouse scope at JWT issuance time.
 *
 * Authentication is done by the shared-secret header added via
 * {@link InternalAuthRequestInterceptor}.
 */
@FeignClient(name = "user-service", url = "${smartpos.user-service.base-url:http://localhost:8082}",
        configuration = InternalAuthRequestInterceptor.Config.class)
public interface UserServiceClient {

    record AuthClaims(
            UUID userId,
            String email,
            UUID tenantId,
            boolean isAllWarehouses,
            Set<UUID> warehouseIds,
            List<String> roles,
            List<String> permissions
    ) {}

    @GetMapping("/api/internal/users/{id}/auth-claims")
    AuthClaims authClaims(@PathVariable("id") UUID id);
}
