package io.smartpos.audit.application;

import io.smartpos.audit.domain.model.Backup;
import io.smartpos.audit.domain.repository.BackupRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.UUID;
import java.util.concurrent.ThreadLocalRandom;

@Service
@Slf4j
@RequiredArgsConstructor
public class BackupService {

    private final BackupRepository backupRepository;

    @Async
    public void executeBackup(UUID backupId) {
        backupRepository.findById(backupId).ifPresent(backup -> {
            try {
                // Mark as in progress
                backup.setStatus("in_progress");
                backupRepository.save(backup);

                log.info("Starting backup: {} (tenant={})", backup.getName(), backup.getTenantId());

                /*
                 * Production: execute pg_dump
                 * ProcessBuilder pb = new ProcessBuilder(
                 *     "pg_dump", "-h", "localhost", "-p", "5434",
                 *     "-U", "smartpos", "-d", "audit_db",
                 *     "-F", "c", "-f", "/tmp/backup_" + backupId + ".dump"
                 * );
                 * pb.environment().put("PGPASSWORD", System.getenv("DB_PASSWORD"));
                 * Process process = pb.start();
                 * int exitCode = process.waitFor();
                 * if (exitCode != 0) { throw new RuntimeException("pg_dump failed with exit code " + exitCode); }
                 */

                // Dev mode: simulate with a 2-second delay
                Thread.sleep(2000);

                long sizeBytes = ThreadLocalRandom.current().nextLong(50_000_000L, 300_000_000L);
                backup.setSizeBytes(sizeBytes);
                backup.setFilePath("/tmp/backup_" + backupId + ".dump");
                backup.setStatus("completed");
                backup.setCompletedAt(Instant.now());
                backupRepository.save(backup);

                log.info("Backup completed: {} ({} MB)", backup.getName(), sizeBytes / 1_000_000);
            } catch (Exception e) {
                log.error("Backup failed: {}", backup.getName(), e);
                backup.setStatus("failed");
                backup.setErrorMessage(e.getMessage());
                backupRepository.save(backup);
            }
        });
    }
}
