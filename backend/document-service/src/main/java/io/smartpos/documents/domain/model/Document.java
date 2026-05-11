package io.smartpos.documents.domain.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "documents")
@Getter @Setter
@NoArgsConstructor @AllArgsConstructor
@Builder
public class Document {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "tenant_id", nullable = false)
    private UUID tenantId;

    @Column(name = "document_type", nullable = false, length = 50)
    private String documentType;

    @Column(name = "document_number", nullable = false, length = 100)
    private String documentNumber;

    @Column(name = "reference_type", length = 50)
    private String referenceType;

    @Column(name = "reference_id")
    private UUID referenceId;

    @Column(length = 30)
    @Builder.Default
    private String status = "draft";

    @Column(name = "storage_path", length = 500)
    private String storagePath;

    @Column(name = "content_type", length = 100)
    @Builder.Default
    private String contentType = "application/pdf";

    @Column(name = "size_bytes")
    private Long sizeBytes;

    @Column(length = 30)
    private String watermark;

    @Column(name = "created_by")
    private UUID createdBy;

    @Column(length = 500)
    private String summary;

    @Column(name = "created_at", nullable = false, updatable = false)
    @Builder.Default
    private Instant createdAt = Instant.now();

    @Column(name = "fiscal_code", length = 50)
    private String fiscalCode;

    @Column(name = "z_number", length = 50)
    private String zNumber;

    @Column(name = "receipt_number", length = 50)
    private String receiptNumber;

    @Column(name = "buyer_tin", length = 30)
    private String buyerTin;

    @Column(name = "vfd_status", length = 20)
    @Builder.Default
    private String vfdStatus = "pending";

    @Column(name = "vfd_submitted_at")
    private Instant vfdSubmittedAt;

    @Column(name = "vfd_response", columnDefinition = "jsonb")
    private String vfdResponse;
}
