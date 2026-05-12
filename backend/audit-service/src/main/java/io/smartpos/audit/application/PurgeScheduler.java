package io.smartpos.audit.application;

import io.smartpos.audit.domain.model.PurgeHistory;
import io.smartpos.audit.domain.model.RetentionConfig;
import io.smartpos.audit.domain.repository.*;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Component
@RequiredArgsConstructor
@Slf4j
public class PurgeScheduler {

    private final RetentionConfigRepository retentionConfigRepo;
    private final AuditEventRepository auditEventRepo;
    private final ErrorLogRepository errorLogRepo;
    private final PurgeHistoryRepository purgeHistoryRepo;
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Scheduled(cron = "0 0 3 * * *") // Daily at 3am
    @Transactional
    public void executeScheduledPurge() {
        log.info("Starting scheduled purge...");
        List<RetentionConfig> configs = retentionConfigRepo.findAll();

        for (RetentionConfig config : configs) {
            try {
                @SuppressWarnings("unchecked")
                Map<String, Integer> rules = objectMapper.readValue(config.getConfig(), Map.class);
                for (Map.Entry<String, Integer> rule : rules.entrySet()) {
                    purgeEntity(config.getTenantId(), rule.getKey(), rule.getValue(), "SCHEDULE", null);
                }
            } catch (Exception e) {
                log.error("Failed to process retention config for tenant {}", config.getTenantId(), e);
            }
        }
        log.info("Scheduled purge complete.");
    }

    private void purgeEntity(UUID tenantId, String entityType, int retentionMonths,
                             String triggeredBy, String actor) {
        Instant cutoff = Instant.now().minus(retentionMonths * 30L, ChronoUnit.DAYS);
        int count = 0;

        switch (entityType) {
            case "audit_events":
                count = auditEventRepo.deleteByTenantIdAndTimestampBefore(tenantId, cutoff);
                break;
            case "error_logs":
                count = errorLogRepo.deleteByTenantIdAndOccurredAtBefore(tenantId, cutoff);
                break;
            default:
                return;
        }

        if (count > 0) {
            purgeHistoryRepo.save(PurgeHistory.builder()
                .tenantId(tenantId)
                .entityType(entityType)
                .recordsRemoved(count)
                .triggeredBy(triggeredBy)
                .triggeredByActor(actor)
                .build());
            log.info("Purged {} {} records for tenant {}", count, entityType, tenantId);
        }
    }
}
