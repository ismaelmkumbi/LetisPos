package io.smartpos.auth.infrastructure.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "smartpos.auth.jwt")
public record JwtProperties(
        String issuer,
        int accessTokenTtlMinutes,
        int refreshTokenTtlDays,
        String privateKeyPath,
        String publicKeyPath,
        String keyId
) {}
