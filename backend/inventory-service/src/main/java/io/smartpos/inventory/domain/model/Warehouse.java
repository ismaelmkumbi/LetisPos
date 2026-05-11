package io.smartpos.inventory.domain.model;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "warehouses")
@Getter @Setter
@NoArgsConstructor @AllArgsConstructor
@Builder
public class Warehouse {

    @Id
    @Column(name = "id", nullable = false, updatable = false)
    private UUID id;

    @Column(name = "code")    private String code;
    @Column(name = "name", nullable = false) private String name;
    @Column(name = "city")    private String city;
    @Column(name = "country") private String country;
    @Column(name = "phone")   private String phone;
    @Column(name = "email")   private String email;
    @Column(name = "zip")     private String zip;
    @Column(name = "notes")   private String notes;

    @Column(name = "is_active", nullable = false)
    @Builder.Default
    private boolean active = true;

    @Column(name = "tenant_id")
    private UUID tenantId;

    @Column(name = "branch_id")
    private UUID branchId;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @PrePersist
    void onCreate() {
        if (id == null) id = UUID.randomUUID();
        Instant now = Instant.now();
        if (createdAt == null) createdAt = now;
        updatedAt = now;
    }

    @PreUpdate
    void onUpdate() { updatedAt = Instant.now(); }
}
