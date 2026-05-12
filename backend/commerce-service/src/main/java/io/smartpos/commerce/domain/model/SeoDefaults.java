package io.smartpos.commerce.domain.model;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "seo_defaults")
@Getter @Setter
@NoArgsConstructor @AllArgsConstructor
@Builder
public class SeoDefaults {

    @Id
    @Column(name = "id", nullable = false, updatable = false)
    private UUID id;

    @Column(name = "tenant_id", nullable = false)
    private UUID tenantId;

    @Column(name = "store_id", nullable = false)
    private UUID storeId;

    @Column(name = "meta_title_template")
    @Builder.Default
    private String metaTitleTemplate = "{{title}} | {{store_name}}";

    @Column(name = "meta_description_template")
    @Builder.Default
    private String metaDescriptionTemplate = "{{description}}";

    @Column(name = "og_image_url")
    private String ogImageUrl;

    @Column(name = "twitter_handle")
    private String twitterHandle;

    @Column(name = "robots_txt", columnDefinition = "text")
    @Builder.Default
    private String robotsTxt = "User-agent: *\nAllow: /";

    @Column(name = "google_site_verification")
    private String googleSiteVerification;

    @Column(name = "custom_head_html", columnDefinition = "text")
    private String customHeadHtml;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @Version
    @Column(name = "version", nullable = false)
    @Builder.Default
    private long version = 0;

    @PrePersist
    void onCreate() {
        if (id == null) id = UUID.randomUUID();
        Instant now = Instant.now();
        if (createdAt == null) createdAt = now;
        updatedAt = now;
    }

    @PreUpdate
    void onUpdate() {
        updatedAt = Instant.now();
    }
}
