package io.smartpos.documents.domain.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "document_versions",
       uniqueConstraints = @UniqueConstraint(columnNames = {"document_id", "version_number"}))
@Getter @Setter
@NoArgsConstructor @AllArgsConstructor
@Builder
public class DocumentVersion {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "document_id", nullable = false)
    private UUID documentId;

    @Column(name = "version_number", nullable = false)
    private int versionNumber;

    @Column(name = "storage_path", nullable = false, length = 500)
    private String storagePath;

    @Column(name = "change_type", nullable = false, length = 30)
    @Builder.Default
    private String changeType = "created";

    @Column(name = "change_summary", length = 500)
    private String changeSummary;

    @Column(name = "created_by")
    private UUID createdBy;

    @Column(name = "created_at", nullable = false, updatable = false)
    @Builder.Default
    private Instant createdAt = Instant.now();
}
