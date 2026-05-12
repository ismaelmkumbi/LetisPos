package io.smartpos.billing.api;

import io.smartpos.billing.application.StripeBillingService;
import io.smartpos.billing.domain.model.Invoice;
import io.smartpos.billing.domain.model.PlanDefinition;
import io.smartpos.billing.domain.model.Subscription;
import io.smartpos.billing.domain.repository.InvoiceRepository;
import io.smartpos.billing.domain.repository.PlanDefinitionRepository;
import io.smartpos.billing.domain.repository.SubscriptionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/billing/subscriptions")
@RequiredArgsConstructor
public class SubscriptionController {

    private final SubscriptionRepository subscriptionRepo;
    private final PlanDefinitionRepository planRepo;
    private final InvoiceRepository invoiceRepo;
    private final StripeBillingService stripeBillingService;

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
        Subscription saved = subscriptionRepo.save(subscription);

        // Auto-generate invoice on subscription creation
        long amount = "ANNUAL".equals(saved.getBillingCycle())
            ? planRepo.findByCode(saved.getPlanCode())
                .map(PlanDefinition::getAnnualPriceTzs)
                .orElse(0L)
            : planRepo.findByCode(saved.getPlanCode())
                .map(PlanDefinition::getMonthlyPriceTzs)
                .orElse(0L);

        Invoice invoice = Invoice.builder()
            .tenantId(saved.getTenantId())
            .subscriptionId(saved.getId())
            .invoiceNumber("INV-" + System.currentTimeMillis())
            .amountTzs(amount)
            .status("PENDING")
            .dueDate(Instant.now().plus(7, ChronoUnit.DAYS))
            .build();
        invoiceRepo.save(invoice);

        return ResponseEntity.ok(saved);
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

    @PostMapping("/{id}/checkout")
    @PreAuthorize("hasAuthority('billing.manage') or @tenantOwnershipCheck.isCurrentTenant(#tenantId)")
    public ResponseEntity<Map<String, String>> createCheckout(
            @PathVariable UUID id,
            @RequestParam String successUrl,
            @RequestParam String cancelUrl) {
        Subscription sub = subscriptionRepo.findById(id)
            .orElseThrow(() -> new IllegalArgumentException("Subscription not found"));
        PlanDefinition plan = planRepo.findByCode(sub.getPlanCode())
            .orElseThrow(() -> new IllegalArgumentException("Plan not found"));

        long amount = "ANNUAL".equals(sub.getBillingCycle()) && plan.getAnnualPriceTzs() != null
            ? plan.getAnnualPriceTzs()
            : plan.getMonthlyPriceTzs();

        String checkoutUrl = stripeBillingService.createCheckoutSession(
            sub.getTenantId(), sub.getId(), sub.getPlanCode(),
            sub.getBillingCycle(), amount, successUrl, cancelUrl);

        return ResponseEntity.ok(Map.of("checkoutUrl", checkoutUrl));
    }

    @PostMapping("/{id}/upgrade")
    @PreAuthorize("hasAuthority('billing.manage') or @tenantOwnershipCheck.isCurrentTenant(#tenantId)")
    public Map<String, Object> upgrade(@PathVariable UUID id, @RequestBody Map<String, String> body) {
        String newPlanCode = body.get("planCode");
        if (newPlanCode == null || newPlanCode.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "planCode is required");
        }
        Subscription sub = subscriptionRepo.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                        "Subscription not found: " + id));

        String oldPlanCode = sub.getPlanCode();
        Instant now = Instant.now();

        // Calculate proration
        long daysRemaining = java.time.Duration.between(now, sub.getCurrentPeriodEnd()).toDays();
        long totalDays = 30;
        double oldDailyRate = getPlanPrice(oldPlanCode) / (double) totalDays;
        double newDailyRate = getPlanPrice(newPlanCode) / (double) totalDays;
        double proratedCredit = oldDailyRate * Math.max(0, daysRemaining);
        double proratedCharge = newDailyRate * Math.max(0, daysRemaining);
        double amountDue = Math.max(0, proratedCharge - proratedCredit);

        // Apply upgrade immediately
        sub.setPlanCode(newPlanCode);
        sub.setCurrentPeriodStart(now);
        sub.setCurrentPeriodEnd(now.plusSeconds(30 * 86400));
        sub.setUpdatedAt(now);
        subscriptionRepo.save(sub);

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("subscription", sub);
        result.put("proration", Map.of(
            "daysRemaining", daysRemaining,
            "oldDailyRate", Math.round(oldDailyRate),
            "newDailyRate", Math.round(newDailyRate),
            "proratedCredit", Math.round(proratedCredit),
            "proratedCharge", Math.round(proratedCharge),
            "amountDue", Math.round(amountDue)
        ));
        return result;
    }

    private long getPlanPrice(String planCode) {
        return switch (planCode.toLowerCase()) {
            case "starter" -> 15000;
            case "business" -> 35000;
            case "professional" -> 79000;
            case "enterprise" -> 250000;
            default -> 0;
        };
    }

    @PostMapping("/{id}/cancel")
    @PreAuthorize("hasAuthority('billing.manage') or @tenantOwnershipCheck.isCurrentTenant(#tenantId)")
    public ResponseEntity<Subscription> cancel(@PathVariable UUID id) {
        Subscription sub = subscriptionRepo.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                        "Subscription not found: " + id));
        sub.setStatus("CANCELLED");
        sub.setCancelledAt(Instant.now());
        return ResponseEntity.ok(subscriptionRepo.save(sub));
    }
}
