package io.smartpos.payment.api;

import io.smartpos.payment.api.dto.JournalEntryDto;
import io.smartpos.payment.application.JournalEntryService;
import io.smartpos.payment.domain.model.JournalStatus;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/journal-entries")
@RequiredArgsConstructor
public class JournalEntryController {

    private final JournalEntryService service;

    @GetMapping
    @PreAuthorize("hasAuthority('journal.view')")
    public Page<JournalEntryDto> search(@RequestParam(required = false) JournalStatus status,
                                        @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
                                        @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
                                        @RequestParam(required = false) String source,
                                        Pageable pageable) {
        return service.search(status, from, to, source, pageable);
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAuthority('journal.view')")
    public JournalEntryDto get(@PathVariable UUID id) { return service.get(id); }

    @PostMapping
    @PreAuthorize("hasAuthority('journal.create')")
    public ResponseEntity<JournalEntryDto> create(@Valid @RequestBody JournalEntryDto.CreateRequest req) {
        return ResponseEntity.status(HttpStatus.CREATED).body(service.create(req));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('journal.update')")
    public JournalEntryDto update(@PathVariable UUID id, @RequestBody JournalEntryDto.UpdateRequest req) {
        return service.update(id, req);
    }

    @PostMapping("/{id}/post")
    @PreAuthorize("hasAuthority('journal.post')")
    public JournalEntryDto post(@PathVariable UUID id, @AuthenticationPrincipal Jwt jwt) {
        UUID userId = (jwt == null) ? null : safeUuid(jwt.getSubject());
        return service.post(id, userId);
    }

    @PostMapping("/{id}/void")
    @PreAuthorize("hasAuthority('journal.post')")
    public JournalEntryDto voidEntry(@PathVariable UUID id,
                                     @Valid @RequestBody JournalEntryDto.VoidRequest req,
                                     @AuthenticationPrincipal Jwt jwt) {
        UUID userId = (jwt == null) ? null : safeUuid(jwt.getSubject());
        return service.voidEntry(id, req.reason(), userId);
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('journal.delete')")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable UUID id) { service.delete(id); }

    private UUID safeUuid(String s) {
        try { return UUID.fromString(s); } catch (Exception ignored) { return null; }
    }
}
