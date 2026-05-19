package io.smartpos.user.domain.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "feature_assignments",
    uniqueConstraints = @UniqueConstraint(columnNames = {"feature_key", "assignment_level", "target_id"}))
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class FeatureAssignment {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "feature_key", nullable = false, length = 100)
    private String featureKey;

    @Column(name = "assignment_level", nullable = false, length = 10)
    @Enumerated(EnumType.STRING)
    private AssignmentLevel assignmentLevel;

    @Column(name = "target_id", nullable = false, length = 100)
    private String targetId;

    @Column(nullable = false)
    @Builder.Default
    private boolean granted = true;

    @Column(name = "created_by")
    private UUID createdBy;

    @Column(name = "created_at", nullable = false, updatable = false)
    @Builder.Default
    private Instant createdAt = Instant.now();

    public enum AssignmentLevel {
        PLAN, TENANT, USER
    }
}
