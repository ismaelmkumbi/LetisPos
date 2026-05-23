package io.smartpos.auth.infrastructure.security;

import io.smartpos.auth.infrastructure.feign.UserServiceClient;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.Set;
import java.util.UUID;

/**
 * Delegates to user-service Feign client for JWT claim hydration.
 * Direct passthrough — caching can be layered on here once Redis is
 * verified healthy in the target environment.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class ClaimsCacheService {

    private final UserServiceClient userServiceClient;

    public UserServiceClient.AuthClaims authClaims(UUID userId) {
        return userServiceClient.authClaims(userId);
    }

    public Set<String> resolvedFeatures(String tenantId, String userId, String planCode) {
        return userServiceClient.resolvedFeatures(tenantId, userId, planCode);
    }
}
