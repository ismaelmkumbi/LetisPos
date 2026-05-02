package io.smartpos.user.i18n;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "translations")
@Getter @Setter
@NoArgsConstructor @AllArgsConstructor
@Builder
public class Translation {

    @Id @Column(name = "id", nullable = false, updatable = false)
    private UUID id;

    @Column(name = "language_code", nullable = false, length = 10) private String languageCode;

    @Column(name = "namespace", nullable = false)
    @Builder.Default
    private String namespace = "app";

    @Column(name = "key", nullable = false)   private String key;
    @Column(name = "value", nullable = false, columnDefinition = "TEXT") private String value;
    @Column(name = "tenant_id") private UUID tenantId;
    @Column(name = "updated_at", nullable = false) private Instant updatedAt;

    @PrePersist
    void onCreate() {
        if (id == null) id = UUID.randomUUID();
        if (updatedAt == null) updatedAt = Instant.now();
    }
    @PreUpdate void onUpdate() { updatedAt = Instant.now(); }
}
