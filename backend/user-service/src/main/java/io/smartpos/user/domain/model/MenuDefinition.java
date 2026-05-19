package io.smartpos.user.domain.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "menu_definitions")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MenuDefinition {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "parent_id")
    private MenuDefinition parent;

    @OneToMany(mappedBy = "parent", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("sortOrder ASC")
    @Builder.Default
    private List<MenuDefinition> children = new ArrayList<>();

    @Column(nullable = false, unique = true, length = 100)
    private String key;

    @Column(nullable = false, length = 100)
    private String label;

    @Column(length = 50)
    private String icon;

    @Column(length = 255)
    private String route;

    @Column(name = "required_feature_key", length = 100)
    private String requiredFeatureKey;

    @Column(name = "sort_order", nullable = false)
    @Builder.Default
    private int sortOrder = 0;

    @Column(name = "is_visible", nullable = false)
    @Builder.Default
    private boolean visible = true;

    @Column(name = "is_section_header", nullable = false)
    @Builder.Default
    private boolean sectionHeader = false;

    @Column(name = "created_at", nullable = false, updatable = false)
    @Builder.Default
    private Instant createdAt = Instant.now();

    @Column(name = "updated_at")
    private Instant updatedAt;

    @PreUpdate
    void onUpdate() {
        this.updatedAt = Instant.now();
    }
}
