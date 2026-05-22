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
 *   email, tenantId, tenantStatus, billingPlan
 *   roles[]      — role names (populated later from User Service)
 *   permissions[]— flat permission strings (populated later)
 *   features[]   — resolved feature flags (populated later from User Service)
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
                                   String tenantStatus, String billingPlan,
                                   List<String> roles, List<String> permissions,
                                   List<String> features, int maxUsers, int maxStores) {
        Instant now = Instant.now();
        Instant exp = now.plus(Duration.ofMinutes(props.accessTokenTtlMinutes()));
        Map<String, Object> claims = new HashMap<>();
        claims.put("email", email);
        if (tenantId != null) claims.put("tenantId", tenantId.toString());
        if (tenantStatus != null) claims.put("tenantStatus", tenantStatus);
        if (billingPlan != null) claims.put("billingPlan", billingPlan);
        if (roles != null) claims.put("roles", roles);
        if (permissions != null) claims.put("permissions", permissions);
        if (features != null) claims.put("features", features);
        claims.put("tenantMaxUsers", maxUsers);
        claims.put("tenantMaxStores", maxStores);

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

    /** Extract permission list from the JWT claims. */
    @SuppressWarnings("unchecked")
    public List<String> extractPermissions(String token) {
        try {
            List<String> permissions = (List<String>) Jwts.parser()
                    .verifyWith(keyPair.getPublic())
                    .build()
                    .parseSignedClaims(token)
                    .getPayload()
                    .get("permissions");
            return permissions != null ? permissions : List.of();
        } catch (Exception e) {
            return List.of();
        }
    }

    /** Extract feature list from the JWT claims. */
    @SuppressWarnings("unchecked")
    public List<String> extractFeatures(String token) {
        try {
            List<String> features = (List<String>) Jwts.parser()
                    .verifyWith(keyPair.getPublic())
                    .build()
                    .parseSignedClaims(token)
                    .getPayload()
                    .get("features");
            return features != null ? features : List.of();
        } catch (Exception e) {
            return List.of();
        }
    }

    /** Extract role list from the JWT claims. */
    @SuppressWarnings("unchecked")
    public List<String> extractRoles(String token) {
        try {
            List<String> roles = (List<String>) Jwts.parser()
                    .verifyWith(keyPair.getPublic())
                    .build()
                    .parseSignedClaims(token)
                    .getPayload()
                    .get("roles");
            return roles != null ? roles : List.of();
        } catch (Exception e) {
            return List.of();
        }
    }

    /** Returns true if the token contains the given permission. */
    @SuppressWarnings("unchecked")
    public boolean hasPermission(String token, String permission) {
        try {
            List<String> permissions = (List<String>) Jwts.parser()
                    .verifyWith(keyPair.getPublic())
                    .build()
                    .parseSignedClaims(token)
                    .getPayload()
                    .get("permissions");
            return permissions != null && permissions.contains(permission);
        } catch (Exception e) {
            return false;
        }
    }

    /**
     * Parse the JWT once and return all relevant claims in a single record.
     * Avoids paying RSA signature verification cost 4× per /me request.
     */
    public record ParsedClaims(String subject, List<String> roles,
                                List<String> permissions, List<String> features) {}

    public ParsedClaims parseAllClaims(String token) {
        var payload = Jwts.parser()
                .verifyWith(keyPair.getPublic())
                .build()
                .parseSignedClaims(token)
                .getPayload();

        @SuppressWarnings("unchecked")
        List<String> roles = (List<String>) payload.get("roles");
        @SuppressWarnings("unchecked")
        List<String> permissions = (List<String>) payload.get("permissions");
        @SuppressWarnings("unchecked")
        List<String> features = (List<String>) payload.get("features");

        return new ParsedClaims(
                payload.getSubject(),
                roles != null ? roles : List.of(),
                permissions != null ? permissions : List.of(),
                features != null ? features : List.of()
        );
    }

    public KeyPair keyPair() { return keyPair; }
    public String keyId()    { return props.keyId(); }
}
