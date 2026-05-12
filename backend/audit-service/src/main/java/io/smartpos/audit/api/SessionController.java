package io.smartpos.audit.api;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.Collections;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/admin")
public class SessionController {

    /**
     * Session tracking is not yet implemented. Returns empty page.
     */
    @GetMapping("/sessions")
    @PreAuthorize("hasAuthority('audit.view')")
    public ResponseEntity<Page<SessionDto>> listSessions(
            @RequestParam(required = false) String userId,
            @RequestParam(required = false) String status,
            Pageable pageable) {
        return ResponseEntity.ok(new PageImpl<>(Collections.emptyList(), pageable, 0));
    }

    @DeleteMapping("/sessions/{id}")
    @PreAuthorize("hasAuthority('audit.view')")
    public ResponseEntity<Void> revokeSession(@PathVariable String id) {
        return ResponseEntity.noContent().build();
    }

    public record SessionDto(
            String tokenId,
            String userId,
            String userName,
            String userEmail,
            String deviceInfo,
            String ipAddress,
            String lastActivityAt,
            String createdAt,
            String status
    ) {}
}
