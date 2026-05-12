package io.smartpos.crm.domain.model;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

@Entity
@Table(name = "opportunities")
@Getter @Setter
@NoArgsConstructor @AllArgsConstructor
@Builder
public class Opportunity {

    @Id
    @Column(name = "id", nullable = false, updatable = false)
    private UUID id;

    @Column(name = "tenant_id", nullable = false)
    private UUID tenantId;

    @Column(name = "title", nullable = false, length = 300)
    private String title;

    @Column(name = "customer_id")
    private UUID customerId;

    @Column(name = "customer_name", length = 200)
    private String customerName;

    @Column(name = "value_tzs", nullable = false)
    @Builder.Default
    private Long valueTzs = 0L;

    @Column(name = "probability", nullable = false)
    @Builder.Default
    private Integer probability = 50;

    @Column(name = "stage", nullable = false, length = 20)
    @Builder.Default
    private String stage = "new";

    @Column(name = "expected_close_date")
    private LocalDate expectedCloseDate;

    @Column(name = "lead_id")
    private UUID leadId;

    @Column(name = "assigned_to")
    private UUID assignedTo;

    @Column(name = "notes", columnDefinition = "TEXT")
    private String notes;

    @Column(name = "created_by", length = 200)
    private String createdBy;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @PrePersist
    void onCreate() {
        if (id == null) id = UUID.randomUUID();
        Instant now = Instant.now();
        if (createdAt == null) createdAt = now;
        if (updatedAt == null) updatedAt = now;
    }

    @PreUpdate
    void onUpdate() {
        updatedAt = Instant.now();
    }
}
