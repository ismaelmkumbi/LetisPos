package io.smartpos.integration.application;

import io.smartpos.integration.domain.model.IntegrationSync;
import io.smartpos.integration.domain.repository.IntegrationSyncRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.PageRequest;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;

@Component
@RequiredArgsConstructor
@Slf4j
public class SyncRetryScheduler {

    private static final int MAX_ATTEMPTS = 6;
    private static final int BATCH_SIZE = 100;

    private final IntegrationSyncRepository syncRepo;

    @Scheduled(fixedDelay = 60000) // Every 60 seconds
    @Transactional
    public void retryFailedSyncs() {
        List<IntegrationSync> retryable = syncRepo.retryable(
                Instant.now(), MAX_ATTEMPTS, PageRequest.of(0, BATCH_SIZE));

        for (IntegrationSync sync : retryable) {
            if (sync.getAttempts() >= MAX_ATTEMPTS) {
                // Permanently failed — clear nextRetryAt so it's excluded from future polls
                sync.setNextRetryAt(null);
                sync.setErrorMessage((sync.getErrorMessage() != null ? sync.getErrorMessage() + "; " : "")
                        + "Permanently failed after " + MAX_ATTEMPTS + " attempts");
                syncRepo.save(sync);
                log.warn("Sync {} permanently failed after {} attempts", sync.getId(), MAX_ATTEMPTS);
                continue;
            }
            // Schedule next retry with exponential backoff: 1min, 2min, 4min, 8min, 16min, 32min
            sync.setAttempts(sync.getAttempts() + 1);
            sync.setNextRetryAt(Instant.now().plusSeconds(
                    (long) (60 * Math.pow(2, sync.getAttempts()))));
            syncRepo.save(sync);
            log.info("Scheduled retry #{} for sync {} (provider={}, entityType={})",
                    sync.getAttempts(), sync.getId(), sync.getProvider(), sync.getEntityType());
        }

        if (!retryable.isEmpty()) {
            log.debug("Processed {} retryable syncs", retryable.size());
        }
    }
}
