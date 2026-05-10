package io.smartpos.documents.domain.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "template_overrides",
       uniqueConstraints = @UniqueConstraint(columnNames = {"tenant_id", "document_type"}))
@Getter @Setter
@NoArgsConstructor @AllArgsConstructor
@Builder
public class TemplateOverride {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "tenant_id", nullable = false)
    private UUID tenantId;

    @Column(name = "document_type", nullable = false, length = 50)
    private String documentType;

    @Column(length = 200)
    private String name;

    @Column(name = "body_html", nullable = false, columnDefinition = "TEXT")
    private String bodyHtml;

    @Column(name = "is_active", nullable = false)
    @Builder.Default
    private boolean isActive = true;

    @Version
    @Builder.Default
    private int version = 1;

    @Column(name = "updated_by")
    private UUID updatedBy;

    @Column(name = "updated_at", nullable = false)
    @Builder.Default
    private Instant updatedAt = Instant.now();
}
