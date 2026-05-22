package io.smartpos.auth.api;

import io.smartpos.auth.domain.model.Tenant;
import io.smartpos.auth.domain.model.User;
import io.smartpos.auth.domain.repository.TenantRepository;
import io.smartpos.auth.domain.repository.UserRepository;
import io.smartpos.auth.infrastructure.security.JwtTokenService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/auth")
@RequiredArgsConstructor
public class MeController {

    private final JwtTokenService jwtTokenService;
    private final UserRepository userRepository;
    private final TenantRepository tenantRepository;

    @GetMapping("/me")
    public Map<String, Object> me(@RequestHeader(value = "Authorization", required = false) String authHeader) {
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Missing Bearer token");
        }
        String token = authHeader.substring(7);

        // Parse JWT once — claim extraction was 4 separate verifications.
        JwtTokenService.ParsedClaims claims;
        try {
            claims = jwtTokenService.parseAllClaims(token);
        } catch (Exception e) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid token");
        }

        User user = userRepository.findById(UUID.fromString(claims.subject()))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("id", user.getId());
        result.put("email", user.getEmail());
        result.put("status", user.getStatus());
        result.put("tenantId", user.getTenantId() == null ? "" : user.getTenantId().toString());
        result.put("lastLoginAt", user.getLastLoginAt() == null ? "" : user.getLastLoginAt().toString());
        result.put("permissions", claims.permissions());
        result.put("features", claims.features());
        result.put("roles", claims.roles());

        // Enrich with tenant details when available
        if (user.getTenantId() != null) {
            tenantRepository.findById(user.getTenantId()).ifPresent(t -> {
                result.put("tenantName", t.getName());
                result.put("tenantSlug", t.getSlug());
                result.put("billingPlan", t.getBillingPlan().name());
                result.put("tenantStatus", t.getStatus().name());
                result.put("maxUsers", t.getMaxUsers());
                result.put("maxStores", t.getMaxStores());
                result.put("trialEndsAt", t.getTrialEndsAt() != null ? t.getTrialEndsAt().toString() : null);
            });
        }

        return result;
    }
}
