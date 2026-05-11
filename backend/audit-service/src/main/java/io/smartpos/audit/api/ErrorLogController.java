package io.smartpos.audit.api;

import io.smartpos.audit.domain.model.ErrorLog;
import io.smartpos.audit.domain.repository.ErrorLogRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequiredArgsConstructor
@Slf4j
public class ErrorLogController {

    private final ErrorLogRepository errorLogRepository;

    @PostMapping("/api/v1/audit/error-logs")
    public ResponseEntity<Void> ingestErrorLogs(@RequestBody List<ErrorLog> errorLogs) {
        List<ErrorLog> saved = errorLogRepository.saveAll(errorLogs);
        log.debug("Ingested {} error logs", saved.size());
        return ResponseEntity.status(HttpStatus.CREATED).build();
    }

    @GetMapping("/api/v1/admin/error-logs")
    @PreAuthorize("hasAuthority('error_log.view')")
    public ResponseEntity<List<ErrorLog>> listErrorLogs(
            @RequestParam(required = false) String service,
            @RequestParam(required = false) String level,
            Pageable pageable) {
        List<ErrorLog> logs;
        if (service != null) {
            logs = errorLogRepository.findByServiceOrderByOccurredAtDesc(service, pageable);
        } else if (level != null) {
            logs = errorLogRepository.findByLevelOrderByOccurredAtDesc(level, pageable);
        } else {
            logs = errorLogRepository.findByTenantIdOrderByOccurredAtDesc(
                    resolveTenantId(), pageable);
        }
        return ResponseEntity.ok(logs);
    }

    private java.util.UUID resolveTenantId() {
        return java.util.UUID.randomUUID(); // placeholder
    }
}
