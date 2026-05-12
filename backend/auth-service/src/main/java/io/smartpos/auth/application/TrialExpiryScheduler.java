package io.smartpos.auth.application;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
@Slf4j
public class TrialExpiryScheduler {

    private final TenantService tenantService;

    @Scheduled(cron = "0 15 3 * * *")  // Daily at 3:15am
    public void expireTrials() {
        log.info("Running trial expiry check...");
        int expired = tenantService.expireTrials();
        if (expired > 0) {
            log.info("Expired {} trials", expired);
        }

        int suspended = tenantService.suspendPastDueAccounts();
        if (suspended > 0) {
            log.info("Suspended {} past-due accounts", suspended);
        }
    }
}
