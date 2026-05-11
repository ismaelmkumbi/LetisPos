package io.smartpos.documents.domain.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "template_versions",
       uniqueConstraints = @UniqueConstraint(columnNames = {"template_override_id", "version_number"}))
@Getter @Setter
@NoArgsConstructor @AllArgsConstructor
@Builder
public class TemplateVersion {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "template_override_id", nullable = false)
    private UUID templateOverrideId;

    @Column(name = "version_number", nullable = false)
    private int versionNumber;

    @Column(name = "body_html", nullable = false, columnDefinition = "TEXT")
    private String bodyHtml;

    @Column(name = "change_description", length = 300)
    private String changeDescription;

    @Column(name = "updated_by")
    private UUID updatedBy;

    @Column(name = "updated_at", nullable = false)
    @Builder.Default
    private Instant updatedAt = Instant.now();
}
