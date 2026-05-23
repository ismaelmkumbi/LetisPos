package io.smartpos.auth.infrastructure.security;

import io.smartpos.auth.infrastructure.feign.UserServiceClient;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;

import java.util.Set;
import java.util.UUID;

/**
 * Delegates to user-service for JWT claim hydration and caches the result
 * briefly. Login is on the interactive path, so repeated user-service calls
 * should not happen on every token issue.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class ClaimsCacheService {

    private final UserServiceClient userServiceClient;

    @Cacheable(value = "auth:claims", key = "#userId", unless = "#result == null")
    public UserServiceClient.AuthClaims authClaims(UUID userId) {
        return userServiceClient.authClaims(userId);
    }

    @Cacheable(value = "auth:features", key = "#tenantId + ':' + #userId + ':' + #planCode", unless = "#result == null")
    public Set<String> resolvedFeatures(String tenantId, String userId, String planCode) {
        return userServiceClient.resolvedFeatures(tenantId, userId, planCode);
    }
}
