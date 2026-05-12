package io.smartpos.billing.application;

import io.smartpos.billing.domain.model.Invoice;
import io.smartpos.billing.domain.model.Subscription;
import io.smartpos.billing.domain.repository.InvoiceRepository;
import io.smartpos.billing.domain.repository.SubscriptionRepository;
import io.smartpos.billing.infrastructure.feign.NotificationClient;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.Map;

@Slf4j
@Component
@RequiredArgsConstructor
public class DunningScheduler {

    private final SubscriptionRepository subscriptionRepo;
    private final InvoiceRepository invoiceRepo;
    private final NotificationClient notificationClient;

    @Scheduled(cron = "0 0 8 * * *") // 8am daily
    public void processDunning() {
        List<Subscription> pastDue = subscriptionRepo.findByStatus("PAST_DUE");
        Instant now = Instant.now();

        log.info("DunningScheduler running: found {} PAST_DUE subscriptions", pastDue.size());

        for (Subscription sub : pastDue) {
            long daysSinceUpdated = Duration.between(sub.getUpdatedAt(), now).toDays();

            if (daysSinceUpdated >= 7) {
                sub.setStatus("SUSPENDED");
                subscriptionRepo.save(sub);
                log.info("Suspended subscription {} (tenant={}) after {} days non-payment",
                    sub.getId(), sub.getTenantId(), daysSinceUpdated);

                if (sub.getOwnerEmail() != null && !sub.getOwnerEmail().isBlank()) {
                    try {
                        notificationClient.send(Map.of(
                            "channel", "EMAIL",
                            "recipient", sub.getOwnerEmail(),
                            "subject", "Subscription Suspended — LetisPOS " + sub.getPlanCode() + " Plan",
                            "body", "Your LetisPOS " + sub.getPlanCode()
                                + " subscription has been suspended due to non-payment.\n\n"
                                + "To restore access, please make a payment at your earliest convenience.\n\n"
                                + "Thank you for using LetisPOS!"
                        ));
                    } catch (Exception e) {
                        log.warn("Failed to send suspension email for subscription {}: {}", sub.getId(), e.getMessage());
                    }
                }

            } else if (daysSinceUpdated == 1 || daysSinceUpdated == 3) {
                log.info("Dunning day {} for subscription {} (tenant={})",
                    daysSinceUpdated, sub.getId(), sub.getTenantId());

                // Find the latest failed invoice for this subscription to reference
                List<Invoice> invoices = invoiceRepo.findBySubscriptionId(sub.getId());
                Invoice latestInvoice = invoices.stream()
                    .filter(inv -> "FAILED".equals(inv.getStatus()) || "PENDING".equals(inv.getStatus()))
                    .reduce((first, second) -> second)
                    .orElse(null);

                String amountRef = latestInvoice != null
                    ? "TZS " + latestInvoice.getAmountTzs() + " (Invoice: " + latestInvoice.getInvoiceNumber() + ")"
                    : "your subscription amount";

                if (sub.getOwnerEmail() != null && !sub.getOwnerEmail().isBlank()) {
                    try {
                        notificationClient.send(Map.of(
                            "channel", "EMAIL",
                            "recipient", sub.getOwnerEmail(),
                            "subject", "Payment Reminder — LetisPOS " + sub.getPlanCode() + " Plan",
                            "body", "This is a payment reminder for your LetisPOS "
                                + sub.getPlanCode() + " subscription.\n\n"
                                + "An outstanding payment of " + amountRef
                                + " is past due.\n\n"
                                + "Please make a payment to keep your service active.\n\n"
                                + "Thank you for using LetisPOS!"
                        ));
                    } catch (Exception e) {
                        log.warn("Failed to send dunning email for subscription {}: {}", sub.getId(), e.getMessage());
                    }
                }

            } else {
                log.debug("No dunning action needed for subscription {} at day {} since update",
                    sub.getId(), daysSinceUpdated);
            }
        }
    }
}
