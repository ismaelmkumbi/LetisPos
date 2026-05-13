package io.smartpos.auth.infrastructure.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "smartpos.auth.jwt")
public record JwtProperties(
        String issuer,
        int accessTokenTtlMinutes,
        int refreshTokenTtlDays,
        String privateKeyPath,
        String publicKeyPath,
        boolean allowEphemeralKeys,
        String keyId,
        /** HttpOnly cookie name for browser clients (Path=/api/v1/auth). */
        String refreshCookieName,
        /** Set true when serving auth only over HTTPS. */
        boolean refreshCookieSecure
) {}
