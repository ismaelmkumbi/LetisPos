package io.smartpos.auth.application;

import io.smartpos.auth.domain.model.Tenant;
import io.smartpos.auth.domain.model.User;
import io.smartpos.auth.domain.repository.UserRepository;
import io.smartpos.auth.infrastructure.feign.NotificationClient;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Map;
import java.util.Optional;

@Component
@RequiredArgsConstructor
@Slf4j
public class TrialExpiryScheduler {

    private final TenantService tenantService;
    private final UserRepository userRepository;
    private final NotificationClient notificationClient;

    @Scheduled(cron = "0 15 3 * * *")  // Daily at 3:15am
    public void expireTrials() {
        log.info("Running trial expiry check...");
        List<Tenant> expired = tenantService.expireTrials();
        if (!expired.isEmpty()) {
            log.info("Expired {} trials", expired.size());

            // Send email notifications to trial-expired tenants
            for (Tenant t : expired) {
                sendTrialExpiryEmail(t);
            }
        }

        int suspended = tenantService.suspendPastDueAccounts();
        if (suspended > 0) {
            log.info("Suspended {} past-due accounts", suspended);
        }
    }

    private void sendTrialExpiryEmail(Tenant tenant) {
        try {
            Optional<User> owner = userRepository
                .findFirstByTenantIdOrderByCreatedAtAsc(tenant.getId());
            if (owner.isEmpty()) {
                log.warn("No owner found for tenant {}, skipping trial expiry email", tenant.getId());
                return;
            }

            String recipientEmail = owner.get().getEmail();
            notificationClient.send(Map.of(
                "channel", "EMAIL",
                "recipient", recipientEmail,
                "subject", "Your LetisPOS trial has expired",
                "body", "Your 30-day free trial of the " + tenant.getBillingPlan()
                    + " plan has expired. Please subscribe to continue using LetisPOS.\n\n"
                    + "Visit: https://app.letispos.com/billing to upgrade."
            ));
            log.info("Sent trial expiry email to {} for tenant {}", recipientEmail, tenant.getId());
        } catch (Exception e) {
            log.warn("Failed to send trial expiry email to tenant {}", tenant.getId(), e);
        }
    }
}
