package io.smartpos.sales.domain.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "brand_presets")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BrandPreset {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false, length = 100)
    private String name;

    @Column(nullable = false, length = 50)
    private String industry;

    @Column(columnDefinition = "TEXT")
    @Builder.Default
    private String description = "";

    @Column(name = "thumbnail_url", columnDefinition = "TEXT")
    @Builder.Default
    private String thumbnailUrl = "";

    @Column(name = "palette_json", columnDefinition = "JSONB", nullable = false)
    private String paletteJson;

    @Column(name = "typography_json", columnDefinition = "JSONB")
    @Builder.Default
    private String typographyJson = "{}";

    @Column(name = "is_premium")
    @Builder.Default
    private boolean isPremium = false;

    @Column(name = "sort_order")
    @Builder.Default
    private int sortOrder = 0;

    @Column(name = "created_at", nullable = false, updatable = false)
    @Builder.Default
    private Instant createdAt = Instant.now();

    @PrePersist
    void onCreate() {
        if (createdAt == null) createdAt = Instant.now();
    }
}
