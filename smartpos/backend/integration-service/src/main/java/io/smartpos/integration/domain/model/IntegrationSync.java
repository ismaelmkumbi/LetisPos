package io.smartpos.integration.domain.model;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "integration_syncs")
@Getter @Setter
@NoArgsConstructor @AllArgsConstructor
@Builder
public class IntegrationSync {

    @Id @Column(name = "id", nullable = false, updatable = false)
    private UUID id;

    @Column(name = "provider",  nullable = false) private String provider;
    @Column(name = "direction", nullable = false) private String direction;
    @Column(name = "entity_type", nullable = false) private String entityType;
    @Column(name = "entity_id")  private UUID   entityId;
    @Column(name = "external_id") private String externalId;

    @Column(name = "status", nullable = false)
    @Builder.Default
    private String status = "PENDING";

    @Column(name = "attempts", nullable = false)
    @Builder.Default
    private int attempts = 0;

    @Column(name = "request_body",  columnDefinition = "TEXT") private String requestBody;
    @Column(name = "response_body", columnDefinition = "TEXT") private String responseBody;
    @Column(name = "error_message")  private String errorMessage;
    @Column(name = "next_retry_at")  private Instant nextRetryAt;
    @Column(name = "tenant_id") private UUID tenantId;
    @Column(name = "created_at", nullable = false, updatable = false) private Instant createdAt;
    @Column(name = "completed_at") private Instant completedAt;

    @PrePersist
    void onCreate() {
        if (id == null) id = UUID.randomUUID();
        if (createdAt == null) createdAt = Instant.now();
    }
}
