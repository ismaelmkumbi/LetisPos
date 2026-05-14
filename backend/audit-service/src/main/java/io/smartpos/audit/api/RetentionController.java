package io.smartpos.audit.api;

import io.smartpos.audit.domain.model.PurgeHistory;
import io.smartpos.audit.domain.model.RetentionConfig;
import io.smartpos.audit.domain.repository.*;
import io.smartpos.common.context.TenantContext;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/admin/retention")
@RequiredArgsConstructor
public class RetentionController {

    private final RetentionConfigRepository retentionConfigRepo;
    private final PurgeHistoryRepository purgeHistoryRepo;
    private final AuditEventRepository auditEventRepo;
    private final ErrorLogRepository errorLogRepo;
    private final ObjectMapper objectMapper = new ObjectMapper();

    @GetMapping
    @PreAuthorize("hasAuthority('retention.manage') or hasAuthority('admin')")
    public ResponseEntity<RetentionConfig> getConfig() {
        UUID tenantId = TenantContext.get().orElse(null);
        return ResponseEntity.ok(
            retentionConfigRepo.findByTenantId(tenantId)
                .orElseGet(() -> createDefault(tenantId))
        );
    }

    @PutMapping
    @PreAuthorize("hasAuthority('retention.manage') or hasAuthority('admin')")
    public ResponseEntity<RetentionConfig> updateConfig(
            @RequestBody Map<String, Integer> config) {
        UUID tenantId = TenantContext.get().orElse(null);
        RetentionConfig rc = retentionConfigRepo.findByTenantId(tenantId)
            .orElseGet(() -> createDefault(tenantId));

        try {
            rc.setConfig(objectMapper.writeValueAsString(config));
        } catch (Exception e) {
            throw new RuntimeException("Invalid config JSON");
        }
        rc.setUpdatedAt(Instant.now());
        return ResponseEntity.ok(retentionConfigRepo.save(rc));
    }

    @GetMapping("/history")
    @PreAuthorize("hasAuthority('retention.manage') or hasAuthority('admin')")
    public ResponseEntity<List<PurgeHistory>> getHistory() {
        UUID tenantId = TenantContext.require();
        return ResponseEntity.ok(purgeHistoryRepo.findByTenantIdOrderByExecutedAtDesc(tenantId));
    }

    @PostMapping("/purge/{entityType}")
    @PreAuthorize("hasAuthority('retention.manage') or hasAuthority('admin')")
    public ResponseEntity<Map<String, Object>> manualPurge(
            @PathVariable String entityType) {
        UUID tenantId = TenantContext.require();
        int count = executePurge(tenantId, entityType, "MANUAL", "admin");
        return ResponseEntity.ok(Map.of("entityType", entityType, "recordsRemoved", count));
    }

    private RetentionConfig createDefault(UUID tenantId) {
        RetentionConfig rc = RetentionConfig.builder()
            .tenantId(tenantId)
            .config("{\"audit_events\":12,\"error_logs\":6,\"revoked_sessions\":3}")
            .build();
        return retentionConfigRepo.save(rc);
    }

    private int executePurge(UUID tenantId, String entityType, String triggeredBy, String actor) {
        RetentionConfig rc = retentionConfigRepo.findByTenantId(tenantId).orElse(null);
        if (rc == null) return 0;

        int retentionMonths = 12;
        try {
            @SuppressWarnings("unchecked")
            Map<String, Integer> config = objectMapper.readValue(rc.getConfig(), Map.class);
            retentionMonths = config.getOrDefault(entityType, 12);
        } catch (Exception ignored) {}

        Instant cutoff = Instant.now().minus(retentionMonths * 30L, ChronoUnit.DAYS);
        int count = 0;

        switch (entityType) {
            case "audit_events":
                count = auditEventRepo.deleteByTenantIdAndTimestampBefore(tenantId, cutoff);
                break;
            case "error_logs":
                count = errorLogRepo.deleteByTenantIdAndOccurredAtBefore(tenantId, cutoff);
                break;
        }

        PurgeHistory history = PurgeHistory.builder()
            .tenantId(tenantId)
            .entityType(entityType)
            .recordsRemoved(count)
            .triggeredBy(triggeredBy)
            .triggeredByActor(actor)
            .build();
        purgeHistoryRepo.save(history);

        return count;
    }
}
