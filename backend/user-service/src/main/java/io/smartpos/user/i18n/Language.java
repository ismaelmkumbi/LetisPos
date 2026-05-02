package io.smartpos.user.i18n;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "languages")
@Getter @Setter
@NoArgsConstructor @AllArgsConstructor
@Builder
public class Language {

    @Id @Column(name = "id", nullable = false, updatable = false)
    private UUID id;

    @Column(name = "code", nullable = false, length = 10) private String code;
    @Column(name = "name", nullable = false) private String name;

    @Column(name = "rtl", nullable = false)
    @Builder.Default
    private boolean rtl = false;

    @Column(name = "enabled", nullable = false)
    @Builder.Default
    private boolean enabled = true;

    @Column(name = "is_default", nullable = false)
    @Builder.Default
    private boolean isDefault = false;

    @Column(name = "tenant_id") private UUID tenantId;
    @Column(name = "created_at", nullable = false, updatable = false) private Instant createdAt;

    @PrePersist
    void onCreate() {
        if (id == null) id = UUID.randomUUID();
        if (createdAt == null) createdAt = Instant.now();
    }
}
