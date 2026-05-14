package io.smartpos.auth.api.dto;

import java.util.UUID;

public record AuthResponse(
        String accessToken,
        String refreshToken,
        String tokenType,
        long expiresIn,         // seconds
        UserSummary user,
        String warning
) {
    public record UserSummary(UUID id, String email, UUID tenantId) {}
}
