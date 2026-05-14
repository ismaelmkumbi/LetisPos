package io.smartpos.auth.domain.model;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;
import org.springframework.data.annotation.CreatedBy;
import org.springframework.data.annotation.LastModifiedBy;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.UUID;

@Entity
@Table(name = "tenants")
@Getter @Setter
@NoArgsConstructor @AllArgsConstructor
@Builder
@EntityListeners(AuditingEntityListener.class)
public class Tenant {

    @Id
    @Column(name = "id", nullable = false, updatable = false)
    private UUID id;

    @Column(name = "name", nullable = false, length = 120)
    private String name;

    @Column(name = "slug", nullable = false, length = 80)
    private String slug;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false)
    @Builder.Default
    private TenantStatus status = TenantStatus.TRIAL;

    @Enumerated(EnumType.STRING)
    @Column(name = "billing_plan", nullable = false)
    @Builder.Default
    private BillingPlan billingPlan = BillingPlan.STARTER;

    @Column(name = "max_users", nullable = false)
    @Builder.Default
    private int maxUsers = 5;

    @Column(name = "max_stores", nullable = false)
    @Builder.Default
    private int maxStores = 1;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "settings")
    @Builder.Default
    private String settings = "{}";

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @Column(name = "trial_ends_at")
    private Instant trialEndsAt;

    @Column(name = "status_changed_at")
    private Instant statusChangedAt;

    @Column(name = "status_reason", length = 500)
    private String statusReason;

    @CreatedBy
    @Column(name = "created_by", length = 200, updatable = false)
    private String createdBy;

    @LastModifiedBy
    @Column(name = "last_modified_by", length = 200)
    private String lastModifiedBy;

    @PrePersist
    void onCreate() {
        if (id == null) id = UUID.randomUUID();
        Instant now = Instant.now();
        if (createdAt == null) createdAt = now;
        if (trialEndsAt == null) trialEndsAt = createdAt.plus(30, ChronoUnit.DAYS);
        if (statusChangedAt == null) statusChangedAt = createdAt;
        updatedAt = now;
    }

    @PreUpdate
    void onUpdate() {
        updatedAt = Instant.now();
    }

    public boolean isActive() {
        return status == TenantStatus.ACTIVE || status == TenantStatus.TRIAL;
    }

    public boolean isBlocked() {
        return status == TenantStatus.SUSPENDED || status == TenantStatus.CLOSED;
    }

    public boolean isLoginBlocked() {
        return status == TenantStatus.SUSPENDED
            || status == TenantStatus.CLOSED
            || status == TenantStatus.DISABLED
            || status == TenantStatus.DELETED;
    }

    public void disable() {
        this.status = TenantStatus.DISABLED;
        this.statusChangedAt = Instant.now();
    }

    public void softDelete() {
        this.status = TenantStatus.DELETED;
        this.statusChangedAt = Instant.now();
    }

    public void deriveLimits() {
        switch (billingPlan) {
            case STARTER -> { maxUsers = 2; maxStores = 1; }
            case BUSINESS -> { maxUsers = 5; maxStores = 3; }
            case PROFESSIONAL -> { maxUsers = 25; maxStores = 10; }
            case ENTERPRISE -> { maxUsers = Integer.MAX_VALUE; maxStores = Integer.MAX_VALUE; }
        }
    }

    public boolean isTrialExpired() {
        return status == TenantStatus.TRIAL && trialEndsAt != null && Instant.now().isAfter(trialEndsAt);
    }
}
