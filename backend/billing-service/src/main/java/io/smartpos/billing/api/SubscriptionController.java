package io.smartpos.billing.api;

import io.smartpos.billing.application.StripeBillingService;
import io.smartpos.billing.domain.model.Invoice;
import io.smartpos.billing.domain.model.PlanDefinition;
import io.smartpos.billing.domain.model.Subscription;
import io.smartpos.billing.domain.repository.InvoiceRepository;
import io.smartpos.billing.domain.repository.PlanDefinitionRepository;
import io.smartpos.billing.domain.repository.SubscriptionRepository;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
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

    @Value("${smartpos.internal.shared-secret:dev-internal-token-change-me}")
    private String sharedSecret;

    @GetMapping("/tenant/{tenantId}")
    @PreAuthorize("hasAuthority('billing.view') or @tenantOwnershipCheck.isCurrentTenant(#tenantId)")
    public ResponseEntity<Subscription> getByTenant(@PathVariable UUID tenantId) {
        return subscriptionRepo.findByTenantId(tenantId)
                .map(ResponseEntity::ok)
                .orElseGet(() -> {
                    // Auto-create a trial subscription if none exists
                    PlanDefinition defaultPlan = planRepo.findByCode("STARTER")
                            .orElse(planRepo.findAll().stream().findFirst().orElse(null));
                    if (defaultPlan == null) return ResponseEntity.notFound().build();
                    Instant now = Instant.now();
                    Subscription sub = Subscription.builder()
                            .tenantId(tenantId)
                            .planCode(defaultPlan.getCode())
                            .status("TRIAL")
                            .billingCycle("MONTHLY")
                            .currentPeriodStart(now)
                            .currentPeriodEnd(now.plus(30, ChronoUnit.DAYS))
                            .build();
                    return ResponseEntity.ok(subscriptionRepo.save(sub));
                });
    }

    /**
     * Internal endpoint for auth-service to create a subscription on registration.
     * Accepts either a valid JWT with billing.manage OR the X-Internal-Token header.
     */
    @PostMapping("/admin")
    public ResponseEntity<Subscription> create(@RequestBody Subscription subscription,
                                                HttpServletRequest request) {
        if (!isInternal(request)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Access denied");
        }
        Subscription saved = subscriptionRepo.save(subscription);

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

        return ResponseEntity.status(HttpStatus.CREATED).body(saved);
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

    private boolean isInternal(HttpServletRequest request) {
        String token = request.getHeader("X-Internal-Token");
        return token != null && token.equals(sharedSecret);
    }
}
