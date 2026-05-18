package io.smartpos.documents.domain.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "i18n_labels")
@Getter @Setter
@NoArgsConstructor @AllArgsConstructor
@Builder
public class I18nLabel {
    @Id @Column(name = "id", nullable = false, updatable = false)
    private UUID id;

    @Column(name = "locale", nullable = false, length = 8)
    private String locale;

    @Column(name = "label_key", nullable = false, length = 80)
    private String labelKey;

    @Column(name = "label_value", nullable = false, length = 255)
    private String labelValue;

    @Column(name = "tenant_id")
    private UUID tenantId;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @PrePersist void onCreate() {
        if (id == null) id = UUID.randomUUID();
        if (createdAt == null) createdAt = Instant.now();
    }
}
