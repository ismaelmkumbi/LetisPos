package io.smartpos.auth.infrastructure.security;

import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.SignatureException;
import io.smartpos.auth.infrastructure.config.JwtProperties;
import org.springframework.stereotype.Service;

import java.security.KeyPair;
import java.time.Duration;
import java.time.Instant;
import java.util.*;

/**
 * Issues and verifies JWT access tokens.
 *
 * Claims issued:
 *   sub          — userId (UUID)
 *   iss          — smartpos-auth
 *   aud          — smartpos-api
 *   iat, exp     — issued-at / expiry (seconds since epoch)
 *   jti          — unique token id
 *   email, tenantId
 *   roles[]      — role names (populated later from User Service)
 *   permissions[]— flat permission strings (populated later)
 *
 * Header includes kid = configurable key id for JWKS rotation.
 */
@Service
public class JwtTokenService {

    private final KeyPair keyPair;
    private final JwtProperties props;

    public JwtTokenService(KeyPair keyPair, JwtProperties props) {
        this.keyPair = keyPair;
        this.props = props;
    }

    public String issueAccessToken(UUID userId, String email, UUID tenantId,
                                   List<String> roles, List<String> permissions) {
        Instant now = Instant.now();
        Instant exp = now.plus(Duration.ofMinutes(props.accessTokenTtlMinutes()));
        Map<String, Object> claims = new HashMap<>();
        claims.put("email", email);
        if (tenantId != null) claims.put("tenantId", tenantId.toString());
        if (roles != null) claims.put("roles", roles);
        if (permissions != null) claims.put("permissions", permissions);

        return Jwts.builder()
                .header().keyId(props.keyId()).and()
                .issuer(props.issuer())
                .audience().add("smartpos-api").and()
                .subject(userId.toString())
                .id(UUID.randomUUID().toString())
                .issuedAt(Date.from(now))
                .expiration(Date.from(exp))
                .claims(claims)
                .signWith(keyPair.getPrivate(), Jwts.SIG.RS256)
                .compact();
    }

    /** Returns subject (userId) if token is valid, throws SignatureException otherwise. */
    public String parseSubject(String token) {
        return Jwts.parser()
                .verifyWith(keyPair.getPublic())
                .build()
                .parseSignedClaims(token)
                .getPayload()
                .getSubject();
    }

    public KeyPair keyPair() { return keyPair; }
    public String keyId()    { return props.keyId(); }
}
