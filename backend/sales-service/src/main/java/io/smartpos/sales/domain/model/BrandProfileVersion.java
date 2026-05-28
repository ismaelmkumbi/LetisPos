package io.smartpos.sales.domain.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "brand_profile_versions")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BrandProfileVersion {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "brand_profile_id", nullable = false)
    private UUID brandProfileId;

    @Column(name = "version_number", nullable = false)
    private int versionNumber;

    @Column(name = "snapshot", columnDefinition = "JSONB", nullable = false)
    private String snapshot;

    @Column(name = "changed_by", length = 255)
    private String changedBy;

    @Column(name = "change_summary", columnDefinition = "TEXT")
    private String changeSummary;

    @Column(name = "created_at", nullable = false, updatable = false)
    @Builder.Default
    private Instant createdAt = Instant.now();

    @PrePersist
    void onCreate() {
        if (createdAt == null) createdAt = Instant.now();
    }
}
