package io.smartpos.auth.api;

import io.smartpos.auth.domain.model.User;
import io.smartpos.auth.domain.repository.UserRepository;
import io.smartpos.auth.infrastructure.security.JwtTokenService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import java.util.Map;
import java.util.UUID;

/**
 * Minimal /me endpoint. In Phase 1b this will be enriched via a Feign call
 * to User Service (roles, permissions, warehouses).
 */
@RestController
@RequestMapping("/api/v1/auth")
@RequiredArgsConstructor
public class MeController {

    private final JwtTokenService jwtTokenService;
    private final UserRepository userRepository;

    @GetMapping("/me")
    public Map<String, Object> me(@RequestHeader(value = "Authorization", required = false) String authHeader) {
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Missing Bearer token");
        }
        String token = authHeader.substring(7);
        String sub;
        try {
            sub = jwtTokenService.parseSubject(token);
        } catch (Exception e) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid token");
        }
        User user = userRepository.findById(UUID.fromString(sub))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));
        return Map.of(
                "id",       user.getId(),
                "email",    user.getEmail(),
                "status",   user.getStatus(),
                "tenantId", user.getTenantId() == null ? "" : user.getTenantId().toString(),
                "lastLoginAt", user.getLastLoginAt() == null ? "" : user.getLastLoginAt().toString()
        );
    }
}
