package io.smartpos.sales.domain.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.Instant;
import java.util.UUID;

/**
 * Per-document-type theme override for a tenant.
 * Inherits from BrandProfile by default; overridden fields are stored here.
 */
@Entity
@Table(name = "document_themes", uniqueConstraints = {
    @UniqueConstraint(columnNames = {"tenant_id", "doc_type"})
})
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DocumentTheme {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "tenant_id", nullable = false)
    private UUID tenantId;

    @Column(name = "doc_type", nullable = false, length = 30)
    private String docType; // invoice, receipt, quotation, delivery_note, statement

    @Column(name = "primary_color", length = 10)
    private String primaryColor;

    @Column(name = "accent_color", length = 10)
    private String accentColor;

    @Column(name = "font_family", length = 100)
    private String fontFamily;

    @Column(name = "header_style", length = 20)
    @Builder.Default
    private String headerStyle = "solid";

    @Column(name = "show_watermark")
    @Builder.Default
    private boolean showWatermark = false;

    @Column(name = "show_qr_code")
    @Builder.Default
    private boolean showQrCode = false;

    @Column(name = "created_at", nullable = false, updatable = false)
    @Builder.Default
    private Instant createdAt = Instant.now();

    @Column(name = "updated_at")
    private Instant updatedAt;

    @PrePersist
    void onCreate() {
        if (createdAt == null) createdAt = Instant.now();
    }

    @PreUpdate
    void onUpdate() {
        updatedAt = Instant.now();
    }
}
