package io.smartpos.billing.domain.model;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "payment_methods")
@Getter @Setter
@NoArgsConstructor @AllArgsConstructor
@Builder
public class PaymentMethod {

    @Id
    @Column(name = "id", nullable = false, updatable = false)
    private UUID id;

    @Column(name = "tenant_id", nullable = false)
    private UUID tenantId;

    @Column(name = "type", nullable = false, length = 30)
    private String type;

    @Column(name = "provider", length = 50)
    private String provider;

    @Column(name = "label", nullable = false, length = 100)
    private String label;

    @Column(name = "provider_customer_id", length = 100)
    private String providerCustomerId;

    @Column(name = "is_default", nullable = false)
    @Builder.Default
    private boolean isDefault = false;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @PrePersist
    void onCreate() {
        if (id == null) id = UUID.randomUUID();
        if (createdAt == null) createdAt = Instant.now();
    }
}
