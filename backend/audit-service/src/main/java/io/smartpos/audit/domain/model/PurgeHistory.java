package io.smartpos.audit.domain.model;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "purge_history")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PurgeHistory {

    @Id
    private UUID id;

    @Column(name = "tenant_id", nullable = false)
    private UUID tenantId;

    @Column(name = "entity_type", nullable = false, length = 50)
    private String entityType;

    @Column(name = "records_removed", nullable = false)
    private int recordsRemoved;

    @Column(name = "triggered_by", nullable = false, length = 20)
    private String triggeredBy;

    @Column(name = "triggered_by_actor", length = 200)
    private String triggeredByActor;

    @Column(name = "executed_at", nullable = false)
    private Instant executedAt;

    @PrePersist
    protected void onCreate() {
        if (id == null) {
            id = UUID.randomUUID();
        }
        if (executedAt == null) {
            executedAt = Instant.now();
        }
        if (triggeredBy == null) {
            triggeredBy = "SCHEDULE";
        }
    }
}
