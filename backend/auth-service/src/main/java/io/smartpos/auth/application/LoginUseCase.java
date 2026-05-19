package io.smartpos.auth.application;

import io.smartpos.auth.api.dto.AuthResponse;
import io.smartpos.auth.api.dto.LoginRequest;
import io.smartpos.auth.domain.model.RefreshToken;
import io.smartpos.auth.domain.model.Tenant;
import io.smartpos.auth.domain.model.User;
import io.smartpos.auth.domain.model.UserStatus;
import io.smartpos.auth.domain.repository.RefreshTokenRepository;
import io.smartpos.auth.domain.repository.TenantRepository;
import io.smartpos.auth.domain.repository.UserRepository;
import io.smartpos.auth.infrastructure.config.JwtProperties;
import io.smartpos.auth.infrastructure.feign.UserServiceClient;
import io.smartpos.auth.infrastructure.security.JwtTokenService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.LockedException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Duration;
import java.time.Instant;
import java.util.Base64;
import java.util.List;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class LoginUseCase {

    private final UserRepository userRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final TenantRepository tenantRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtTokenService jwtTokenService;
    private final JwtProperties jwtProperties;

    /**
     * Optional — when user-service isn't reachable (initial boot, network
     * blip) we issue a token with empty claims rather than failing login.
     * The frontend's separate {@code /users/{id}} call will still work
     * once user-service is up, so the UI stays functional.
     */
    @Autowired(required = false)
    private UserServiceClient userServiceClient;

    @Transactional
    public AuthResponse login(LoginRequest request, String userAgent, String ipAddress) {
        User user = userRepository.findByEmailIgnoreCase(request.email())
                .orElseThrow(() -> new BadCredentialsException("Invalid credentials"));

        if (!user.isActive()) {
            if (user.getStatus() == UserStatus.PENDING) {
                throw new LockedException("Please verify your email before logging in. Check your inbox or request a new verification email.");
            }
            throw new LockedException("Account is " + user.getStatus());
        }

        if (!passwordEncoder.matches(request.password(), user.getPasswordHash())) {
            user.recordFailedLogin();
            userRepository.save(user);
            throw new BadCredentialsException("Invalid credentials");
        }

        user.recordSuccessfulLogin();
        userRepository.save(user);

        HydratedClaims claims = hydrateClaims(user);
        String accessToken = jwtTokenService.issueAccessToken(
                user.getId(), user.getEmail(), claims.tenantId(),
                claims.tenantStatus(), claims.billingPlan(),
                claims.roles(), claims.permissions(),
                claims.features(), claims.maxUsers(), claims.maxStores());

        String refreshTokenRaw = generateOpaqueToken();
        RefreshToken rt = RefreshToken.builder()
                .userId(user.getId())
                .tokenHash(sha256(refreshTokenRaw))
                .userAgent(truncate(userAgent, 512))
                .ipAddress(truncate(ipAddress, 64))
                .expiresAt(Instant.now().plus(Duration.ofDays(jwtProperties.refreshTokenTtlDays())))
                .build();
        refreshTokenRepository.save(rt);

        // Determine warning based on tenant status
        String warning = null;
        if (claims.tenantStatus() != null) {
            if ("TRIAL_EXPIRED".equals(claims.tenantStatus())) {
                warning = "Your trial has ended. Subscribe to restore access.";
            } else if ("PAST_DUE".equals(claims.tenantStatus())) {
                warning = "Payment is past due. Update your payment method to avoid suspension.";
            }
        }

        return new AuthResponse(
                accessToken,
                refreshTokenRaw,
                "Bearer",
                jwtProperties.accessTokenTtlMinutes() * 60L,
                new AuthResponse.UserSummary(user.getId(), user.getEmail(), user.getTenantId()),
                warning
        );
    }

    @Transactional
    public AuthResponse refresh(String refreshTokenRaw) {
        String hash = sha256(refreshTokenRaw);
        RefreshToken stored = refreshTokenRepository.findByTokenHash(hash)
                .orElseThrow(() -> new BadCredentialsException("Invalid refresh token"));
        if (!stored.isActive()) {
            throw new BadCredentialsException("Refresh token expired or revoked");
        }

        User user = userRepository.findById(stored.getUserId())
                .orElseThrow(() -> new BadCredentialsException("User not found"));
        if (!user.isActive()) {
            throw new LockedException("Account is " + user.getStatus());
        }

        // Rotate: revoke old, issue new
        stored.revoke();
        refreshTokenRepository.save(stored);

        String newRaw = generateOpaqueToken();
        RefreshToken newToken = RefreshToken.builder()
                .userId(user.getId())
                .tokenHash(sha256(newRaw))
                .expiresAt(Instant.now().plus(Duration.ofDays(jwtProperties.refreshTokenTtlDays())))
                .build();
        refreshTokenRepository.save(newToken);

        HydratedClaims claims = hydrateClaims(user);
        String accessToken = jwtTokenService.issueAccessToken(
                user.getId(), user.getEmail(), claims.tenantId(),
                claims.tenantStatus(), claims.billingPlan(),
                claims.roles(), claims.permissions(),
                claims.features(), claims.maxUsers(), claims.maxStores());

        return new AuthResponse(
                accessToken,
                newRaw,
                "Bearer",
                jwtProperties.accessTokenTtlMinutes() * 60L,
                new AuthResponse.UserSummary(user.getId(), user.getEmail(), claims.tenantId()),
                null
        );
    }

    // ---------------------------------------------------------------
    // JWT claim hydration via user-service
    // ---------------------------------------------------------------

    /** Immutable bag of the claims we embed in every access token. */
    private record HydratedClaims(
            java.util.UUID tenantId,
            String tenantStatus,
            String billingPlan,
            List<String> roles,
            List<String> permissions,
            List<String> features,
            int maxUsers,
            int maxStores
    ) {}

    /**
     * Pulls role + permission + tenant info from user-service over an
     * authenticated (shared-secret) internal HTTP call.
     *
     * Failure modes:
     *  - user-service not reachable → issue token with empty claims, log
     *    a warning. The UI keeps working via the separate /users/{id} call;
     *    downstream @PreAuthorize checks will deny, but the user is still
     *    logged in and can retry once user-service comes back.
     *  - user not yet propagated from auth_db to user_db → same as above.
     *
     * The `sub` claim is still the auth-service user id (used everywhere as
     * principal); the tenant from user-service wins if non-null, else we
     * fall back to auth-service's own tenantId.
     */
    private HydratedClaims hydrateClaims(User user) {
        // Resolve tenant-level claims from auth-service's own tenant table
        String tenantStatus = null;
        String billingPlan = null;
        int maxUsers = 1;
        int maxStores = 1;
        if (user.getTenantId() != null) {
            Tenant tenant = tenantRepository.findById(user.getTenantId()).orElse(null);
            if (tenant != null) {
                tenantStatus = tenant.getStatus().name();
                billingPlan = tenant.getBillingPlan().name();
                maxUsers = tenant.getMaxUsers();
                maxStores = tenant.getMaxStores();
            }
        }

        if (userServiceClient == null) {
            return new HydratedClaims(user.getTenantId(), tenantStatus, billingPlan,
                    List.of(), List.of(), List.of(), maxUsers, maxStores);
        }
        try {
            UserServiceClient.AuthClaims fetched = userServiceClient.authClaims(user.getId());

            // Resolve features from user-service
            List<String> features = List.of();
            if (billingPlan != null && user.getTenantId() != null) {
                try {
                    java.util.Set<String> resolved = userServiceClient.resolvedFeatures(
                            user.getTenantId().toString(),
                            user.getId().toString(),
                            billingPlan);
                    features = resolved != null ? List.copyOf(resolved) : List.of();
                } catch (Exception fe) {
                    log.warn("Could not resolve features from user-service for {}: {}",
                            user.getId(), fe.getMessage());
                }
            }

            return new HydratedClaims(
                    fetched.tenantId() != null ? fetched.tenantId() : user.getTenantId(),
                    tenantStatus,
                    billingPlan,
                    fetched.roles() != null ? fetched.roles() : List.of(),
                    fetched.permissions() != null ? fetched.permissions() : List.of(),
                    features,
                    maxUsers,
                    maxStores
            );
        } catch (Exception e) {
            log.warn("Could not hydrate JWT claims from user-service for {}: {}",
                    user.getId(), e.getMessage());
            return new HydratedClaims(user.getTenantId(), tenantStatus, billingPlan,
                    List.of(), List.of(), List.of(), maxUsers, maxStores);
        }
    }

    @Transactional
    public void logout(String refreshTokenRaw) {
        if (refreshTokenRaw == null || refreshTokenRaw.isBlank()) return;
        refreshTokenRepository.findByTokenHash(sha256(refreshTokenRaw)).ifPresent(rt -> {
            rt.revoke();
            refreshTokenRepository.save(rt);
        });
    }

    // ---- helpers ----

    private static String generateOpaqueToken() {
        byte[] bytes = new byte[48];
        new SecureRandom().nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    private static String sha256(String input) {
        try {
            MessageDigest md = MessageDigest.getInstance("SHA-256");
            return Base64.getUrlEncoder().withoutPadding().encodeToString(md.digest(input.getBytes()));
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException(e);
        }
    }

    private static String truncate(String s, int max) {
        if (s == null) return null;
        return s.length() <= max ? s : s.substring(0, max);
    }
}
