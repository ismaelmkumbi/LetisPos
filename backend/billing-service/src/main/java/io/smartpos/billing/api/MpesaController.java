package io.smartpos.billing.api;

import io.smartpos.billing.domain.model.Invoice;
import io.smartpos.billing.domain.model.Subscription;
import io.smartpos.billing.domain.repository.InvoiceRepository;
import io.smartpos.billing.domain.repository.SubscriptionRepository;
import io.smartpos.billing.infrastructure.feign.NotificationClient;
import io.smartpos.billing.infrastructure.payment.MpesaClient;
import io.smartpos.billing.infrastructure.security.TenantOwnershipCheck;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.util.Map;
import java.util.UUID;

@Slf4j
@RestController
@RequestMapping("/api/v1/billing/mpesa")
@RequiredArgsConstructor
public class MpesaController {

    private final MpesaClient mpesaClient;
    private final SubscriptionRepository subscriptionRepo;
    private final InvoiceRepository invoiceRepo;
    private final NotificationClient notificationClient;
    private final TenantOwnershipCheck tenantCheck;

    @PostMapping("/stk-push")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Map<String, Object>> stkPush(@RequestBody Map<String, String> body) {
        String phone = body.get("phone");
        String amount = body.get("amount");
        String subscriptionId = body.get("subscriptionId");

        Subscription sub = subscriptionRepo.findById(UUID.fromString(subscriptionId))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Subscription not found"));

        String ref = "LETIS-" + sub.getPlanCode().toUpperCase();
        String desc = "LetisPOS " + sub.getPlanCode() + " Subscription";

        Map<String, Object> result = mpesaClient.stkPush(phone, amount, ref, desc);
        return ResponseEntity.ok(result);
    }

    @GetMapping("/query/{checkoutRequestId}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Map<String, Object>> query(@PathVariable String checkoutRequestId) {
        return ResponseEntity.ok(mpesaClient.queryStatus(checkoutRequestId));
    }

    /**
     * M-Pesa payment result callback — called by Safaricom, no client auth.
     */
    @PostMapping("/callback")
    public ResponseEntity<Map<String, String>> callback(@RequestBody Map<String, Object> body) {
        log.info("M-Pesa callback received: {}", body);

        @SuppressWarnings("unchecked")
        Map<String, Object> stkCallback = (Map<String, Object>) ((Map<String, Object>) body.get("Body")).get("stkCallback");
        String resultCode = String.valueOf(stkCallback.get("ResultCode"));
        String merchantRequestId = (String) stkCallback.get("MerchantRequestID");

        if ("0".equals(resultCode)) {
            invoiceRepo.findByPaymentReference(merchantRequestId).ifPresent(inv -> {
                inv.setStatus("PAID");
                inv.setPaidAt(Instant.now());
                invoiceRepo.save(inv);
                log.info("Invoice {} marked PAID via M-Pesa callback (ref: {})", inv.getId(), merchantRequestId);

                // Send payment confirmation email
                Subscription sub = inv.getSubscriptionId() != null
                    ? subscriptionRepo.findById(inv.getSubscriptionId()).orElse(null)
                    : null;
                if (sub != null) {
                    sendPaymentConfirmationEmail(sub, inv);
                }
            });
        } else {
            String resultDesc = (String) stkCallback.get("ResultDesc");
            log.warn("M-Pesa payment failed for {}: {} - {}", merchantRequestId, resultCode, resultDesc);

            invoiceRepo.findByPaymentReference(merchantRequestId).ifPresent(inv -> {
                inv.setStatus("FAILED");
                invoiceRepo.save(inv);
                log.info("Invoice {} marked FAILED via M-Pesa callback (ref: {})", inv.getId(), merchantRequestId);

                // Send payment failure email
                Subscription sub = inv.getSubscriptionId() != null
                    ? subscriptionRepo.findById(inv.getSubscriptionId()).orElse(null)
                    : null;
                if (sub != null) {
                    sendPaymentFailureEmail(sub, inv);

                    // Update subscription status to PAST_DUE
                    if (!"PAST_DUE".equals(sub.getStatus())) {
                        sub.setStatus("PAST_DUE");
                        subscriptionRepo.save(sub);
                    }
                }
            });
        }

        return ResponseEntity.ok(Map.of("ResultCode", "0", "ResultDesc", "Accepted"));
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
