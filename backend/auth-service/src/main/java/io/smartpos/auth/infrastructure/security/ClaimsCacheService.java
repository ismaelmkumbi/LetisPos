package io.smartpos.auth.infrastructure.security;

import io.smartpos.auth.infrastructure.feign.UserServiceClient;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Set;
import java.util.UUID;

/**
 * Redis-backed cache for user-service claims hydration.
 *
 * Cache TTL is controlled by spring.cache.redis.time-to-live (default 60s).
 * Roles, permissions, and resolved features rarely change within a session,
 * so brief caching eliminates the inter-service HTTP calls during login
 * without meaningfully staleness risk.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class ClaimsCacheService {

    private final UserServiceClient userServiceClient;

    @Cacheable(value = "auth-claims", key = "#userId", unless = "#result == null")
    public UserServiceClient.AuthClaims authClaims(UUID userId) {
        return userServiceClient.authClaims(userId);
    }

    @Cacheable(value = "resolved-features", key = "#tenantId + ':' + #userId + ':' + #planCode",
            unless = "#result == null")
    public Set<String> resolvedFeatures(String tenantId, String userId, String planCode) {
        return userServiceClient.resolvedFeatures(tenantId, userId, planCode);
    }
}
