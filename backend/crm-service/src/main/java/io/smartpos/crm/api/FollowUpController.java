package io.smartpos.crm.api;

import io.smartpos.crm.domain.model.FollowUp;
import io.smartpos.crm.domain.repository.FollowUpRepository;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/crm/follow-ups")
@RequiredArgsConstructor
public class FollowUpController {

    private final FollowUpRepository followUpRepo;

    @GetMapping
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Page<FollowUp>> list(
            @RequestHeader("X-Tenant-ID") UUID tenantId,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String priority,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        Pageable pageable = PageRequest.of(page, size, Sort.by("dueDate").ascending());
        Page<FollowUp> result;
        if (status != null && !status.isBlank()) {
            result = followUpRepo.findByTenantIdAndStatus(tenantId, status, pageable);
        } else {
            result = followUpRepo.findByTenantIdOrderByDueDateAsc(tenantId, pageable);
        }
        // Client-side priority filter (if needed, add repository method for combined filters)
        return ResponseEntity.ok(result);
    }

    @GetMapping("/{id}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<FollowUp> get(@RequestHeader("X-Tenant-ID") UUID tenantId, @PathVariable UUID id) {
        FollowUp followUp = followUpRepo.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Follow-up not found: " + id));
        if (!followUp.getTenantId().equals(tenantId)) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(followUp);
    }

    @PostMapping
    @PreAuthorize("hasAuthority('crm.manage')")
    public ResponseEntity<FollowUp> create(@RequestHeader("X-Tenant-ID") UUID tenantId, @RequestBody @Valid FollowUp body) {
        body.setId(null);
        body.setTenantId(tenantId);
        if (body.getStatus() == null) body.setStatus("pending");
        if (body.getType() == null) body.setType("call");
        if (body.getPriority() == null) body.setPriority("medium");
        return ResponseEntity.status(HttpStatus.CREATED).body(followUpRepo.save(body));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('crm.manage')")
    public ResponseEntity<FollowUp> update(
            @RequestHeader("X-Tenant-ID") UUID tenantId,
            @PathVariable UUID id,
            @RequestBody FollowUp update) {
        FollowUp followUp = followUpRepo.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Follow-up not found: " + id));
        if (!followUp.getTenantId().equals(tenantId)) {
            return ResponseEntity.notFound().build();
        }
        if (update.getCustomerId() != null) followUp.setCustomerId(update.getCustomerId());
        if (update.getCustomerName() != null) followUp.setCustomerName(update.getCustomerName());
        if (update.getType() != null) followUp.setType(update.getType());
        if (update.getDueDate() != null) followUp.setDueDate(update.getDueDate());
        if (update.getPriority() != null) followUp.setPriority(update.getPriority());
        if (update.getNotes() != null) followUp.setNotes(update.getNotes());
        if (update.getAssignedTo() != null) followUp.setAssignedTo(update.getAssignedTo());
        return ResponseEntity.ok(followUpRepo.save(followUp));
    }

    @PatchMapping("/{id}/complete")
    @PreAuthorize("hasAuthority('crm.manage')")
    public ResponseEntity<FollowUp> complete(@RequestHeader("X-Tenant-ID") UUID tenantId, @PathVariable UUID id) {
        FollowUp followUp = followUpRepo.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Follow-up not found: " + id));
        if (!followUp.getTenantId().equals(tenantId)) {
            return ResponseEntity.notFound().build();
        }
        followUp.setStatus("completed");
        return ResponseEntity.ok(followUpRepo.save(followUp));
    }

    @PatchMapping("/{id}/status")
    @PreAuthorize("hasAuthority('crm.manage')")
    public ResponseEntity<FollowUp> updateStatus(
            @RequestHeader("X-Tenant-ID") UUID tenantId,
            @PathVariable UUID id,
            @RequestBody FollowUp statusUpdate) {
        FollowUp followUp = followUpRepo.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Follow-up not found: " + id));
        if (!followUp.getTenantId().equals(tenantId)) {
            return ResponseEntity.notFound().build();
        }
        if (statusUpdate.getStatus() != null) followUp.setStatus(statusUpdate.getStatus());
        return ResponseEntity.ok(followUpRepo.save(followUp));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('crm.manage')")
    public ResponseEntity<Void> delete(@RequestHeader("X-Tenant-ID") UUID tenantId, @PathVariable UUID id) {
        FollowUp followUp = followUpRepo.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Follow-up not found: " + id));
        if (!followUp.getTenantId().equals(tenantId)) {
            return ResponseEntity.notFound().build();
        }
        followUpRepo.delete(followUp);
        return ResponseEntity.noContent().build();
    }
}
