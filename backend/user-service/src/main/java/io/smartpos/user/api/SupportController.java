package io.smartpos.user.api;

import io.smartpos.common.context.TenantContext;
import io.smartpos.user.domain.model.SupportTicket;
import io.smartpos.user.domain.repository.SupportTicketRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/support/tickets")
@RequiredArgsConstructor
public class SupportController {

    private final SupportTicketRepository ticketRepository;

    @PostMapping
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<SupportTicket> create(@RequestBody SupportTicket ticket) {
        ticket.setTenantId(TenantContext.require());
        if (ticket.getPriority() == null || ticket.getPriority().isBlank()) {
            ticket.setPriority("medium");
        }
        ticket.setStatus("open");
        SupportTicket saved = ticketRepository.save(ticket);
        return ResponseEntity.status(HttpStatus.CREATED).body(saved);
    }

    /**
     * Public demo request — no auth required. Landing page visitors can
     * submit their contact info to request a product demo.
     */
    @PostMapping("/demo-requests")
    public ResponseEntity<SupportTicket> createDemoRequest(@RequestBody SupportTicket ticket) {
        ticket.setTenantId(null); // no tenant yet — pre-signup
        ticket.setSubject("Demo Request: " + (ticket.getSubject() != null ? ticket.getSubject() : "Landing page"));
        ticket.setPriority("high");
        ticket.setStatus("open");
        SupportTicket saved = ticketRepository.save(ticket);
        return ResponseEntity.status(HttpStatus.CREATED).body(saved);
    }

    @GetMapping
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<List<SupportTicket>> list() {
        UUID tenantId = TenantContext.require();
        return ResponseEntity.ok(ticketRepository.findByTenantIdOrderByCreatedAtDesc(tenantId));
    }

    @GetMapping("/{id}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<SupportTicket> get(@PathVariable UUID id) {
        return ticketRepository.findById(id)
                .filter(t -> t.getTenantId().equals(TenantContext.require()))
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PatchMapping("/{id}/status")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<SupportTicket> updateStatus(
            @PathVariable UUID id,
            @RequestBody Map<String, String> body) {
        return ticketRepository.findById(id)
                .filter(t -> t.getTenantId().equals(TenantContext.require()))
                .map(ticket -> {
                    if (body.containsKey("status")) {
                        ticket.setStatus(body.get("status"));
                    }
                    if (body.containsKey("assignedTo")) {
                        ticket.setAssignedTo(body.get("assignedTo"));
                    }
                    if (body.containsKey("resolutionNotes")) {
                        ticket.setResolutionNotes(body.get("resolutionNotes"));
                    }
                    return ResponseEntity.ok(ticketRepository.save(ticket));
                })
                .orElse(ResponseEntity.notFound().build());
    }
}
