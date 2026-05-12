package io.smartpos.billing.api;

import io.smartpos.billing.domain.model.Invoice;
import io.smartpos.billing.domain.model.Subscription;
import io.smartpos.billing.domain.repository.InvoiceRepository;
import io.smartpos.billing.domain.repository.SubscriptionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

@Slf4j
@RestController
@RequestMapping("/api/v1/billing/webhooks")
@RequiredArgsConstructor
public class WebhookController {

    private final SubscriptionRepository subscriptionRepo;
    private final InvoiceRepository invoiceRepo;

    @PostMapping("/stripe")
    public ResponseEntity<String> stripeWebhook(@RequestBody Map<String, Object> payload,
                                                 @RequestHeader("Stripe-Signature") String signature) {
        String type = (String) payload.getOrDefault("type", "");
        @SuppressWarnings("unchecked")
        Map<String, Object> data = (Map<String, Object>) payload.getOrDefault("data", Map.of());
        @SuppressWarnings("unchecked")
        Map<String, Object> obj = (Map<String, Object>) data.getOrDefault("object", Map.of());

        log.info("Stripe webhook: type={}", type);

        switch (type) {
            case "checkout.session.completed" -> {
                String subscriptionId = (String) obj.get("subscription");
                @SuppressWarnings("unchecked")
                String tenantId = (String) ((Map<String, Object>) obj.getOrDefault("metadata", Map.of())).get("tenantId");
                if (subscriptionId != null && tenantId != null) {
                    Optional<Subscription> sub = subscriptionRepo.findByStripeSubscriptionId(subscriptionId);
                    if (sub.isEmpty()) {
                        sub = subscriptionRepo.findByTenantId(UUID.fromString(tenantId));
                    }
                    sub.ifPresent(s -> {
                        s.setStatus("ACTIVE");
                        s.setStripeSubscriptionId(subscriptionId);
                        s.setCurrentPeriodStart(Instant.now());
                        s.setCurrentPeriodEnd(Instant.now().plusSeconds(30 * 86400));
                        subscriptionRepo.save(s);
                        log.info("Activated subscription for tenant={}", tenantId);
                    });
                }
            }
            case "invoice.paid" -> {
                String invoiceId = (String) obj.get("id");
                String number = (String) obj.get("number");
                invoiceRepo.findByPaymentReference(invoiceId).ifPresent(inv -> {
                    inv.setStatus("PAID");
                    inv.setPaidAt(Instant.now());
                    invoiceRepo.save(inv);
                    log.info("Invoice {} marked paid", number);
                });
            }
            case "invoice.payment_failed" -> {
                String invoiceId = (String) obj.get("id");
                invoiceRepo.findByPaymentReference(invoiceId).ifPresent(inv -> {
                    inv.setStatus("FAILED");
                    invoiceRepo.save(inv);
                    log.warn("Invoice {} payment failed", inv.getInvoiceNumber());
                });
            }
        }
        return ResponseEntity.ok("OK");
    }
}
