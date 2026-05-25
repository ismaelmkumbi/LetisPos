package io.smartpos.sales.domain.model;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;
import java.util.UUID;

/**
 * Async brand-AI job. Created by long-running endpoints (logo gen,
 * enhancement) and polled by the frontend until status is COMPLETED
 * or FAILED.
 *
 * {@code request} and {@code result} are JSONB payloads stored as
 * stringified JSON (matches the convention used by SuspendedSale,
 * Promotion, DraftSale in this service).
 */
@Entity
@Table(name = "brand_ai_jobs")
@Getter @Setter
@NoArgsConstructor @AllArgsConstructor
@Builder
public class BrandAiJob {

    @Id
    private UUID id;

    @Column(name = "tenant_id", nullable = false)
    private UUID tenantId;

    @Column(nullable = false, length = 64)
    private String kind;

    @Column(nullable = false, length = 32)
    @Builder.Default
    private String status = "PENDING";

    @Column(name = "request", columnDefinition = "jsonb")
    private String request;

    @Column(name = "result", columnDefinition = "jsonb")
    private String result;

    @Column(name = "error_msg", columnDefinition = "TEXT")
    private String errorMsg;

    @Column(name = "created_at", nullable = false, updatable = false)
    @Builder.Default
    private Instant createdAt = Instant.now();

    @Column(name = "updated_at", nullable = false)
    @Builder.Default
    private Instant updatedAt = Instant.now();

    @PrePersist
    void onCreate() {
        if (id == null) id = UUID.randomUUID();
        if (createdAt == null) createdAt = Instant.now();
        updatedAt = Instant.now();
    }

    @PreUpdate
    void onUpdate() { updatedAt = Instant.now(); }
}
