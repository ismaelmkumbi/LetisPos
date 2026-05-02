package io.smartpos.report.domain.model;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "processed_events")
@Getter @Setter
@NoArgsConstructor @AllArgsConstructor
@Builder
public class ProcessedEvent {

    @Id
    @Column(name = "event_id", nullable = false, updatable = false)
    private UUID eventId;

    @Column(name = "event_type",     nullable = false) private String eventType;
    @Column(name = "aggregate_type", nullable = false) private String aggregateType;

    @Column(name = "processed_at", nullable = false, updatable = false)
    private Instant processedAt;

    @PrePersist
    void onCreate() { if (processedAt == null) processedAt = Instant.now(); }
}
