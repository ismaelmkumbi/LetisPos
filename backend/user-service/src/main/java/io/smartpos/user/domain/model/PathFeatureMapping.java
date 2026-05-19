package io.smartpos.user.domain.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "path_feature_mappings")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PathFeatureMapping {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "path_pattern", nullable = false, unique = true, length = 255)
    private String pathPattern;

    @Column(name = "required_feature_key", nullable = false, length = 100)
    private String requiredFeatureKey;

    @Column(name = "http_status_on_deny", nullable = false)
    @Builder.Default
    private int httpStatusOnDeny = 402;

    @Column(name = "sort_order", nullable = false)
    @Builder.Default
    private int sortOrder = 0;

    @Column(name = "created_at", nullable = false, updatable = false)
    @Builder.Default
    private Instant createdAt = Instant.now();
}
