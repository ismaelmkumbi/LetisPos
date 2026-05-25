package io.smartpos.user.domain.model;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "user_onboarding_state")
@Getter @Setter
@NoArgsConstructor @AllArgsConstructor
@Builder
public class UserOnboardingState {

    @Id
    @Column(name = "user_id", nullable = false, updatable = false)
    private UUID userId;

    @Column(name = "workspace_completed", nullable = false)
    @Builder.Default
    private boolean workspaceCompleted = true;

    @Column(name = "warehouse_completed", nullable = false)
    @Builder.Default
    private boolean warehouseCompleted = false;

    @Column(name = "tax_completed", nullable = false)
    @Builder.Default
    private boolean taxCompleted = false;

    @Column(name = "products_completed", nullable = false)
    @Builder.Default
    private boolean productsCompleted = false;

    @Column(name = "staff_completed", nullable = false)
    @Builder.Default
    private boolean staffCompleted = false;

    @Column(name = "first_sale_completed", nullable = false)
    @Builder.Default
    private boolean firstSaleCompleted = false;

    @Column(name = "brand_completed", nullable = false)
    @Builder.Default
    private boolean brandCompleted = false;

    @Column(name = "document_theme_completed", nullable = false)
    @Builder.Default
    private boolean documentThemeCompleted = false;

    @Column(name = "completed_at")
    private Instant completedAt;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @PrePersist
    void onCreate() {
        Instant now = Instant.now();
        if (createdAt == null) createdAt = now;
        updatedAt = now;
    }

    @PreUpdate
    void onUpdate() {
        updatedAt = Instant.now();
        checkCompletion();
    }

    public int completionPercent() {
        int completed = 0;
        if (workspaceCompleted) completed++;
        if (warehouseCompleted) completed++;
        if (taxCompleted) completed++;
        if (productsCompleted) completed++;
        // staff is auto-detected by the backend and excluded from the
        // percentage so the frontend's 5-step calculation stays in sync
        if (firstSaleCompleted) completed++;
        return Math.round((completed / 5f) * 100);
    }

    public boolean isComplete() {
        return workspaceCompleted && warehouseCompleted && taxCompleted
                && productsCompleted && firstSaleCompleted;
    }

    private void checkCompletion() {
        if (isComplete() && completedAt == null) {
            completedAt = Instant.now();
        } else if (!isComplete()) {
            completedAt = null;
        }
    }
}
