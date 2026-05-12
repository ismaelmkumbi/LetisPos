package io.smartpos.crm.api;

import io.smartpos.crm.domain.model.Lead;
import io.smartpos.crm.domain.repository.LeadRepository;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
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
@RequestMapping("/api/v1/crm/leads")
@RequiredArgsConstructor
public class LeadController {

    private final LeadRepository leadRepo;

    @GetMapping
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Page<Lead>> list(
            @RequestHeader("X-Tenant-ID") UUID tenantId,
            @RequestParam(required = false) String status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        Pageable pageable = PageRequest.of(page, size, Sort.by("createdAt").descending());
        Page<Lead> result = (status != null && !status.isBlank())
                ? leadRepo.findByTenantIdAndStatus(tenantId, status, pageable)
                : leadRepo.findByTenantIdOrderByCreatedAtDesc(tenantId, pageable);
        return ResponseEntity.ok(result);
    }

    @GetMapping("/{id}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Lead> get(@RequestHeader("X-Tenant-ID") UUID tenantId, @PathVariable UUID id) {
        Lead lead = leadRepo.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Lead not found: " + id));
        if (!lead.getTenantId().equals(tenantId)) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(lead);
    }

    @PostMapping
    @PreAuthorize("hasAuthority('crm.manage')")
    public ResponseEntity<Lead> create(@RequestHeader("X-Tenant-ID") UUID tenantId, @RequestBody @Valid Lead body) {
        body.setId(null);
        body.setTenantId(tenantId);
        body.setConvertedToOpportunityId(null);
        if (body.getStatus() == null) body.setStatus("new");
        if (body.getSource() == null) body.setSource("other");
        return ResponseEntity.status(HttpStatus.CREATED).body(leadRepo.save(body));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('crm.manage')")
    public ResponseEntity<Lead> update(
            @RequestHeader("X-Tenant-ID") UUID tenantId,
            @PathVariable UUID id,
            @RequestBody Lead update) {
        Lead lead = leadRepo.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Lead not found: " + id));
        if (!lead.getTenantId().equals(tenantId)) {
            return ResponseEntity.notFound().build();
        }
        if (update.getName() != null) lead.setName(update.getName());
        if (update.getCompany() != null) lead.setCompany(update.getCompany());
        if (update.getPhone() != null) lead.setPhone(update.getPhone());
        if (update.getEmail() != null) lead.setEmail(update.getEmail());
        if (update.getSource() != null) lead.setSource(update.getSource());
        if (update.getNotes() != null) lead.setNotes(update.getNotes());
        if (update.getAssignedTo() != null) lead.setAssignedTo(update.getAssignedTo());
        return ResponseEntity.ok(leadRepo.save(lead));
    }

    @PatchMapping("/{id}/status")
    @PreAuthorize("hasAuthority('crm.manage')")
    public ResponseEntity<Lead> updateStatus(
            @RequestHeader("X-Tenant-ID") UUID tenantId,
            @PathVariable UUID id,
            @RequestBody @Valid StatusRequest request) {
        Lead lead = leadRepo.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Lead not found: " + id));
        if (!lead.getTenantId().equals(tenantId)) {
            return ResponseEntity.notFound().build();
        }
        lead.setStatus(request.status());
        return ResponseEntity.ok(leadRepo.save(lead));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('crm.manage')")
    public ResponseEntity<Void> delete(@RequestHeader("X-Tenant-ID") UUID tenantId, @PathVariable UUID id) {
        Lead lead = leadRepo.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Lead not found: " + id));
        if (!lead.getTenantId().equals(tenantId)) {
            return ResponseEntity.notFound().build();
        }
        leadRepo.delete(lead);
        return ResponseEntity.noContent().build();
    }

    public record StatusRequest(@NotBlank String status) {}
}
