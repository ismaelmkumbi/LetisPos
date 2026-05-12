package io.smartpos.audit.api;

import io.smartpos.audit.domain.model.ErrorLog;
import io.smartpos.audit.domain.repository.ErrorLogRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
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
    public ResponseEntity<Page<ErrorLog>> listErrorLogs(
            @RequestParam(required = false) String service,
            @RequestParam(required = false) String level,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant dateFrom,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant dateTo,
            Pageable pageable) {
        Pageable sorted = PageRequest.of(
                pageable.getPageNumber(), pageable.getPageSize(),
                Sort.by(Sort.Direction.DESC, "occurredAt"));
        Page<ErrorLog> page;
        if (dateFrom != null && dateTo != null) {
            page = errorLogRepository.findByOccurredAtBetween(dateFrom, dateTo, sorted);
        } else if (service != null) {
            page = errorLogRepository.findByService(service, sorted);
        } else if (level != null) {
            page = errorLogRepository.findByLevel(level, sorted);
        } else {
            page = errorLogRepository.findAll(sorted);
        }
        return ResponseEntity.ok(page);
    }
}
