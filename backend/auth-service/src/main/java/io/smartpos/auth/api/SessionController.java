package io.smartpos.auth.api;

import io.smartpos.auth.domain.model.RefreshToken;
import io.smartpos.auth.domain.model.User;
import io.smartpos.auth.domain.repository.RefreshTokenRepository;
import io.smartpos.auth.domain.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.*;

@RestController
@RequestMapping("/api/v1/admin/sessions")
@RequiredArgsConstructor
public class SessionController {

    private final RefreshTokenRepository refreshTokenRepository;
    private final UserRepository userRepository;

    @GetMapping
    @PreAuthorize("hasAuthority('session.manage')")
    public ResponseEntity<Map<String, Object>> listSessions(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {

        Page<RefreshToken> tokens = refreshTokenRepository.findAllByRevokedAtIsNull(
                PageRequest.of(page, size, Sort.by("createdAt").descending()));

        List<Map<String, Object>> sessions = new ArrayList<>();
        for (RefreshToken t : tokens.getContent()) {
            Map<String, Object> s = new LinkedHashMap<>();
            s.put("tokenId", t.getId().toString());
            s.put("userId", t.getUserId().toString());
            s.put("deviceInfo", t.getUserAgent());
            s.put("ipAddress", t.getIpAddress());
            s.put("lastActivityAt", t.getCreatedAt().toString());
            s.put("createdAt", t.getCreatedAt().toString());
            s.put("status", t.getRevokedAt() != null ? "REVOKED" : "ACTIVE");

            // Enrich with user display info
            userRepository.findById(t.getUserId()).ifPresent(user -> {
                s.put("userName", user.getUsername());
                s.put("userEmail", user.getEmail());
            });

            sessions.add(s);
        }

        Map<String, Object> response = new LinkedHashMap<>();
        response.put("content", sessions);
        response.put("totalPages", tokens.getTotalPages());
        response.put("totalElements", tokens.getTotalElements());
        response.put("number", page);
        response.put("size", size);
        return ResponseEntity.ok(response);
    }

    @DeleteMapping("/{tokenId}")
    @PreAuthorize("hasAuthority('session.manage')")
    public ResponseEntity<Void> revokeSession(@PathVariable UUID tokenId) {
        RefreshToken token = refreshTokenRepository.findById(tokenId)
                .orElseThrow(() -> new IllegalArgumentException("Session not found"));
        token.setRevokedAt(Instant.now());
        refreshTokenRepository.save(token);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/bulk-revoke")
    @PreAuthorize("hasAuthority('session.manage')")
    public ResponseEntity<Void> revokeUserSessions(@RequestBody Map<String, String> body) {
        UUID userId = UUID.fromString(body.get("userId"));
        List<RefreshToken> tokens = refreshTokenRepository.findAllByUserIdAndRevokedAtIsNull(userId);
        Instant now = Instant.now();
        for (RefreshToken t : tokens) {
            t.setRevokedAt(now);
        }
        refreshTokenRepository.saveAll(tokens);
        return ResponseEntity.noContent().build();
    }
}
