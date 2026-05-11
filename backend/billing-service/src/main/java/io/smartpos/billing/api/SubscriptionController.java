package io.smartpos.billing.api;

import io.smartpos.billing.domain.model.Subscription;
import io.smartpos.billing.domain.repository.SubscriptionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/billing/subscriptions")
@RequiredArgsConstructor
public class SubscriptionController {

    private final SubscriptionRepository subscriptionRepo;

    @GetMapping("/tenant/{tenantId}")
    @PreAuthorize("hasAuthority('billing.view') or @tenantOwnershipCheck.isCurrentTenant(#tenantId)")
    public ResponseEntity<Subscription> getByTenant(@PathVariable UUID tenantId) {
        return subscriptionRepo.findByTenantId(tenantId)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping("/admin")
    @PreAuthorize("hasAuthority('billing.manage')")
    public ResponseEntity<Subscription> create(@RequestBody Subscription subscription) {
        return ResponseEntity.ok(subscriptionRepo.save(subscription));
    }

    @PatchMapping("/admin/{id}")
    @PreAuthorize("hasAuthority('billing.manage')")
    public ResponseEntity<Subscription> update(@PathVariable UUID id, @RequestBody Subscription update) {
        Subscription sub = subscriptionRepo.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Subscription not found: " + id));
        if (update.getPlanCode() != null) sub.setPlanCode(update.getPlanCode());
        if (update.getStatus() != null) sub.setStatus(update.getStatus());
        if (update.getBillingCycle() != null) sub.setBillingCycle(update.getBillingCycle());
        return ResponseEntity.ok(subscriptionRepo.save(sub));
    }
}
