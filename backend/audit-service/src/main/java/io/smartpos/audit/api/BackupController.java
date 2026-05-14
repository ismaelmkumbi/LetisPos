package io.smartpos.audit.api;

import io.smartpos.audit.application.BackupService;
import io.smartpos.audit.domain.model.Backup;
import io.smartpos.audit.domain.repository.BackupRepository;
import io.smartpos.common.context.TenantContext;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/admin/backups")
@RequiredArgsConstructor
public class BackupController {

    private final BackupRepository backupRepository;
    private final BackupService backupService;

    @GetMapping
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<List<Backup>> list() {
        UUID tenantId = TenantContext.get().orElse(null);
        return ResponseEntity.ok(backupRepository.findByTenantIdOrderByCreatedAtDesc(tenantId));
    }

    @PostMapping
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Backup> create(@RequestBody Map<String, String> body) {
        UUID tenantId = TenantContext.require();
        String name = body.getOrDefault("name", "backup-" + System.currentTimeMillis());
        String type = body.getOrDefault("type", "full");

        Backup backup = Backup.builder()
                .tenantId(tenantId)
                .name(name)
                .type(type)
                .status("pending")
                .createdBy(body.get("createdBy"))
                .build();

        Backup saved = backupRepository.save(backup);
        backupService.executeBackup(saved.getId());
        return ResponseEntity.status(HttpStatus.CREATED).body(saved);
    }

    @PostMapping("/{id}/restore")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Void> restore(@PathVariable UUID id) {
        UUID tenantId = TenantContext.require();
        return backupRepository.findById(id)
                .filter(b -> b.getTenantId().equals(tenantId))
                .map(b -> {
                    // In production, this would trigger a pg_restore
                    return ResponseEntity.ok().<Void>build();
                })
                .orElse(ResponseEntity.notFound().build());
    }
}
