package io.smartpos.billing.api;

import io.smartpos.billing.domain.model.Invoice;
import io.smartpos.billing.domain.model.Subscription;
import io.smartpos.billing.domain.repository.InvoiceRepository;
import io.smartpos.billing.domain.repository.SubscriptionRepository;
import io.smartpos.billing.infrastructure.feign.NotificationClient;
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
    private final NotificationClient notificationClient;

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

                        // Find the latest invoice for this subscription and send email
                        invoiceRepo.findBySubscriptionId(s.getId()).stream()
                            .filter(inv -> "PENDING".equals(inv.getStatus()) || "PAID".equals(inv.getStatus()))
                            .reduce((first, second) -> second)
                            .ifPresent(inv -> sendPaymentConfirmationEmail(s, inv));
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

                    // Send payment confirmation email
                    Subscription sub = inv.getSubscriptionId() != null
                        ? subscriptionRepo.findById(inv.getSubscriptionId()).orElse(null)
                        : null;
                    if (sub != null) {
                        sendPaymentConfirmationEmail(sub, inv);
                    }
                });
            }
            case "invoice.payment_failed" -> {
                String invoiceId = (String) obj.get("id");
                invoiceRepo.findByPaymentReference(invoiceId).ifPresent(inv -> {
                    inv.setStatus("FAILED");
                    invoiceRepo.save(inv);
                    log.warn("Invoice {} payment failed", inv.getInvoiceNumber());

                    // Send payment failure email
                    Subscription sub = inv.getSubscriptionId() != null
                        ? subscriptionRepo.findById(inv.getSubscriptionId()).orElse(null)
                        : null;
                    if (sub != null) {
                        sendPaymentFailureEmail(sub, inv);
                    }

                    // Update subscription status to PAST_DUE
                    if (sub != null && !"PAST_DUE".equals(sub.getStatus())) {
                        sub.setStatus("PAST_DUE");
                        subscriptionRepo.save(sub);
                        log.info("Updated subscription {} status to PAST_DUE", sub.getId());
                    }
                });
            }
        }
        return ResponseEntity.ok("OK");
    }

    private void sendPaymentConfirmationEmail(Subscription sub, Invoice inv) {
        if (sub.getOwnerEmail() == null || sub.getOwnerEmail().isBlank()) {
            log.debug("No owner email for subscription {}, skipping payment confirmation email", sub.getId());
            return;
        }

        String pdfLink = "";
        if (inv.getDocumentId() != null && !inv.getDocumentId().isBlank()) {
            pdfLink = "https://api.letispos.com/api/v1/documents/" + inv.getDocumentId() + "/pdf";
        }

        try {
            notificationClient.send(Map.of(
                "channel", "EMAIL",
                "recipient", sub.getOwnerEmail(),
                "subject", "Payment Confirmed — LetisPOS " + sub.getPlanCode() + " Plan",
                "body", "Your payment of TZS " + inv.getAmountTzs() + " for the "
                    + sub.getPlanCode() + " plan has been received.\n\n"
                    + "Invoice: " + inv.getInvoiceNumber() + "\n"
                    + "Next billing date: " + sub.getCurrentPeriodEnd() + "\n\n"
                    + (pdfLink.isEmpty() ? "" : "Download your invoice: " + pdfLink + "\n\n")
                    + "Thank you for using LetisPOS!"
            ));
        } catch (Exception e) {
            log.warn("Failed to send payment confirmation email for invoice {}: {}", inv.getInvoiceNumber(), e.getMessage());
        }
    }

    private void sendPaymentFailureEmail(Subscription sub, Invoice inv) {
        if (sub.getOwnerEmail() == null || sub.getOwnerEmail().isBlank()) {
            log.debug("No owner email for subscription {}, skipping payment failure email", sub.getId());
            return;
        }

        try {
            notificationClient.send(Map.of(
                "channel", "EMAIL",
                "recipient", sub.getOwnerEmail(),
                "subject", "Payment Failed — LetisPOS " + sub.getPlanCode() + " Plan",
                "body", "Your recent payment of TZS " + inv.getAmountTzs()
                    + " for the " + sub.getPlanCode() + " plan was unsuccessful.\n\n"
                    + "Invoice: " + inv.getInvoiceNumber() + "\n\n"
                    + "Please update your payment method to keep your service active.\n\n"
                    + "Thank you for using LetisPOS!"
            ));
        } catch (Exception e) {
            log.warn("Failed to send payment failure email for invoice {}: {}", inv.getInvoiceNumber(), e.getMessage());
        }
    }
}
