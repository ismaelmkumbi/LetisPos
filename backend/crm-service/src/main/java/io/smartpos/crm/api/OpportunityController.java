package io.smartpos.crm.api;

import io.smartpos.crm.domain.model.Lead;
import io.smartpos.crm.domain.model.Opportunity;
import io.smartpos.crm.domain.repository.LeadRepository;
import io.smartpos.crm.domain.repository.OpportunityRepository;
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
@RequestMapping("/api/v1/crm/opportunities")
@RequiredArgsConstructor
public class OpportunityController {

    private final OpportunityRepository oppRepo;
    private final LeadRepository leadRepo;

    @GetMapping
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Page<Opportunity>> list(
            @RequestHeader("X-Tenant-ID") UUID tenantId,
            @RequestParam(required = false) String stage,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        Pageable pageable = PageRequest.of(page, size, Sort.by("createdAt").descending());
        Page<Opportunity> result = (stage != null && !stage.isBlank())
                ? oppRepo.findByTenantIdAndStage(tenantId, stage, pageable)
                : oppRepo.findByTenantIdOrderByCreatedAtDesc(tenantId, pageable);
        return ResponseEntity.ok(result);
    }

    @GetMapping("/{id}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Opportunity> get(@RequestHeader("X-Tenant-ID") UUID tenantId, @PathVariable UUID id) {
        Opportunity opp = oppRepo.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Opportunity not found: " + id));
        if (!opp.getTenantId().equals(tenantId)) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(opp);
    }

    @PostMapping
    @PreAuthorize("hasAuthority('crm.manage')")
    public ResponseEntity<Opportunity> create(@RequestHeader("X-Tenant-ID") UUID tenantId, @RequestBody @Valid Opportunity body) {
        body.setId(null);
        body.setTenantId(tenantId);
        if (body.getStage() == null) body.setStage("new");
        if (body.getProbability() == null) body.setProbability(50);
        if (body.getValueTzs() == null) body.setValueTzs(0L);
        return ResponseEntity.status(HttpStatus.CREATED).body(oppRepo.save(body));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('crm.manage')")
    public ResponseEntity<Opportunity> update(
            @RequestHeader("X-Tenant-ID") UUID tenantId,
            @PathVariable UUID id,
            @RequestBody Opportunity update) {
        Opportunity opp = oppRepo.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Opportunity not found: " + id));
        if (!opp.getTenantId().equals(tenantId)) {
            return ResponseEntity.notFound().build();
        }
        if (update.getTitle() != null) opp.setTitle(update.getTitle());
        if (update.getCustomerId() != null) opp.setCustomerId(update.getCustomerId());
        if (update.getCustomerName() != null) opp.setCustomerName(update.getCustomerName());
        if (update.getValueTzs() != null) opp.setValueTzs(update.getValueTzs());
        if (update.getProbability() != null) opp.setProbability(update.getProbability());
        if (update.getExpectedCloseDate() != null) opp.setExpectedCloseDate(update.getExpectedCloseDate());
        if (update.getAssignedTo() != null) opp.setAssignedTo(update.getAssignedTo());
        if (update.getNotes() != null) opp.setNotes(update.getNotes());
        return ResponseEntity.ok(oppRepo.save(opp));
    }

    @PatchMapping("/{id}/stage")
    @PreAuthorize("hasAuthority('crm.manage')")
    public ResponseEntity<Opportunity> updateStage(
            @RequestHeader("X-Tenant-ID") UUID tenantId,
            @PathVariable UUID id,
            @RequestBody @Valid StageRequest request) {
        Opportunity opp = oppRepo.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Opportunity not found: " + id));
        if (!opp.getTenantId().equals(tenantId)) {
            return ResponseEntity.notFound().build();
        }
        opp.setStage(request.stage());
        return ResponseEntity.ok(oppRepo.save(opp));
    }

    @PostMapping("/{id}/convert-from-lead/{leadId}")
    @PreAuthorize("hasAuthority('crm.manage')")
    public ResponseEntity<Opportunity> convertFromLead(
            @RequestHeader("X-Tenant-ID") UUID tenantId,
            @PathVariable UUID id,
            @PathVariable UUID leadId) {
        Opportunity opp = oppRepo.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Opportunity not found: " + id));
        if (!opp.getTenantId().equals(tenantId)) {
            return ResponseEntity.notFound().build();
        }
        Lead lead = leadRepo.findById(leadId)
                .orElseThrow(() -> new IllegalArgumentException("Lead not found: " + leadId));
        if (!lead.getTenantId().equals(tenantId)) {
            return ResponseEntity.notFound().build();
        }
        lead.setStatus("qualified");
        lead.setConvertedToOpportunityId(opp.getId());
        leadRepo.save(lead);
        opp.setLeadId(leadId);
        if (opp.getCustomerName() == null && lead.getName() != null) {
            opp.setCustomerName(lead.getName());
        }
        return ResponseEntity.ok(oppRepo.save(opp));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('crm.manage')")
    public ResponseEntity<Void> delete(@RequestHeader("X-Tenant-ID") UUID tenantId, @PathVariable UUID id) {
        Opportunity opp = oppRepo.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Opportunity not found: " + id));
        if (!opp.getTenantId().equals(tenantId)) {
            return ResponseEntity.notFound().build();
        }
        oppRepo.delete(opp);
        return ResponseEntity.noContent().build();
    }

    public record StageRequest(@NotBlank String stage) {}
}
