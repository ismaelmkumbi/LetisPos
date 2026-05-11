package io.smartpos.audit.api;

import io.smartpos.audit.domain.model.AuditEvent;
import io.smartpos.audit.domain.repository.AuditEventRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Pageable;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@RestController
@RequiredArgsConstructor
@Slf4j
public class AuditEventController {

    private final AuditEventRepository auditEventRepository;

    @PostMapping("/api/v1/audit/events")
    public ResponseEntity<Void> ingestEvents(@RequestBody List<AuditEvent> events) {
        List<AuditEvent> saved = auditEventRepository.saveAll(events);
        log.debug("Ingested {} audit events", saved.size());
        return ResponseEntity.status(HttpStatus.CREATED).build();
    }

    @GetMapping("/api/v1/admin/audit-events")
    @PreAuthorize("hasAuthority('audit.view')")
    public ResponseEntity<List<AuditEvent>> listEvents(
            @RequestParam(required = false) String service,
            @RequestParam(required = false) String action,
            @RequestParam(required = false) UUID actorId,
            @RequestParam(required = false) String targetType,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant dateFrom,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant dateTo,
            Pageable pageable) {
        // For now, use the basic tenant-ordered query; filtering can be enhanced later
        List<AuditEvent> events = auditEventRepository.findByTenantIdOrderByTimestampDesc(
                resolveTenantId(), pageable);
        return ResponseEntity.ok(events);
    }

    @GetMapping("/api/v1/admin/audit-events/{id}")
    @PreAuthorize("hasAuthority('audit.view')")
    public ResponseEntity<AuditEvent> getEvent(@PathVariable UUID id) {
        return auditEventRepository.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    /**
     * Temporary helper — in a real multi-tenant deployment, the tenantId
     * would come from the TenantContext (set by TenantContextFilter from the JWT).
     */
    private UUID resolveTenantId() {
        return UUID.randomUUID(); // placeholder
    }
}
