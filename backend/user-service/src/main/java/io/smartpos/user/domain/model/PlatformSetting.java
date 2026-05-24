package io.smartpos.user.domain.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.Instant;

@Entity
@Table(name = "platform_settings")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PlatformSetting {

    @Id
    @Column(length = 100)
    private String key;

    @Column(columnDefinition = "TEXT")
    private String value;

    @Column(nullable = false, length = 50)
    @Builder.Default
    private String category = "general";

    @Column(nullable = false, length = 255)
    private String label;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(nullable = false)
    @Builder.Default
    private boolean encrypted = false;

    @Column(name = "service_key", length = 50)
    private String serviceKey;

    @Column(name = "service_name", length = 100)
    private String serviceName;

    @Column(name = "service_icon", length = 50)
    private String serviceIcon;

    @Column(name = "sort_order", nullable = false)
    @Builder.Default
    private int sortOrder = 0;

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
