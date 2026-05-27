package io.smartpos.sales.domain.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "brand_assets")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BrandAsset {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "tenant_id", nullable = false)
    private UUID tenantId;

    @Column(nullable = false, length = 255)
    private String name;

    @Column(nullable = false, length = 20)
    private String category; // logo, favicon, watermark, stamp, signature, qr, other

    @Column(nullable = false, length = 10)
    @Builder.Default
    private String format = "png"; // png, svg, jpg, webp, pdf

    @Column(length = 20)
    @Builder.Default
    private String variant = "original"; // original, monochrome, thermal, favicon, thumbnail

    @Column(name = "storage_key", nullable = false, length = 500)
    private String storageKey;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String url;

    @Column
    private Integer width;

    @Column
    private Integer height;

    @Column(name = "size_bytes")
    private Long sizeBytes;

    @Column(name = "ai_generated")
    @Builder.Default
    private boolean aiGenerated = false;

    @Column(name = "created_at", nullable = false, updatable = false)
    @Builder.Default
    private Instant createdAt = Instant.now();
}
