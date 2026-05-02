package io.smartpos.sales.api;

import io.smartpos.sales.api.dto.OfflineSyncDto;
import io.smartpos.sales.application.OfflineSyncService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/offline")
@RequiredArgsConstructor
public class OfflineSyncController {

    private final OfflineSyncService service;

    @PostMapping("/sync")
    @PreAuthorize("hasAuthority('pos.use')")
    public OfflineSyncDto.BatchResult sync(@Valid @RequestBody OfflineSyncDto.BatchUpload batch,
                                           @AuthenticationPrincipal Jwt jwt) {
        UUID userId = (jwt == null) ? null : safeUuid(jwt.getSubject());
        return service.sync(batch, userId);
    }

    private UUID safeUuid(String s) {
        try { return UUID.fromString(s); } catch (Exception ignored) { return null; }
    }
}
