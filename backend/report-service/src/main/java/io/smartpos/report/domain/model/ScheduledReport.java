package io.smartpos.report.domain.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "scheduled_reports")
@Getter @Setter
@NoArgsConstructor @AllArgsConstructor
@Builder
public class ScheduledReport {
    @Id @Column(name = "id", nullable = false, updatable = false)
    private UUID id;
    @Column(name = "tenant_id", nullable = false) private UUID tenantId;
    @Column(name = "report_key", nullable = false) private String reportKey;
    @Column(name = "frequency", nullable = false) private String frequency;
    @Column(name = "cron_expression") private String cronExpression;
    @Column(name = "recipients", nullable = false) private String recipients;
    @Column(name = "format") @Builder.Default private String format = "PDF";
    @Column(name = "active") @Builder.Default private boolean active = true;
    @Column(name = "last_run_at") private Instant lastRunAt;
    @Column(name = "next_run_at") private Instant nextRunAt;
    @Column(name = "created_at", nullable = false, updatable = false) private Instant createdAt;

    @PrePersist void onCreate() {
        if (id == null) id = UUID.randomUUID();
        if (createdAt == null) createdAt = Instant.now();
    }
}
