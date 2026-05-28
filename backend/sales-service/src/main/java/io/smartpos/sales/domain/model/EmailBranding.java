package io.smartpos.sales.domain.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "email_branding")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class EmailBranding {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "tenant_id", unique = true, nullable = false)
    private UUID tenantId;

    @Column(name = "sender_name", length = 255)
    @Builder.Default
    private String senderName = "";

    @Column(name = "sender_email", length = 255)
    @Builder.Default
    private String senderEmail = "";

    @Column(name = "reply_to", length = 255)
    @Builder.Default
    private String replyTo = "";

    @Column(name = "footer_text", columnDefinition = "TEXT")
    @Builder.Default
    private String footerText = "";

    @Column(name = "show_social_links")
    @Builder.Default
    private boolean showSocialLinks = true;

    @Column(name = "invoice_subject_template", length = 500)
    @Builder.Default
    private String invoiceSubjectTemplate = "";

    @Column(name = "invoice_body_html", columnDefinition = "TEXT")
    @Builder.Default
    private String invoiceBodyHtml = "";

    @Column(name = "receipt_subject_template", length = 500)
    @Builder.Default
    private String receiptSubjectTemplate = "";

    @Column(name = "receipt_body_html", columnDefinition = "TEXT")
    @Builder.Default
    private String receiptBodyHtml = "";

    @Column(name = "welcome_subject_template", length = 500)
    @Builder.Default
    private String welcomeSubjectTemplate = "";

    @Column(name = "welcome_body_html", columnDefinition = "TEXT")
    @Builder.Default
    private String welcomeBodyHtml = "";

    @Column(name = "reset_password_subject_template", length = 500)
    @Builder.Default
    private String resetPasswordSubjectTemplate = "";

    @Column(name = "reset_password_body_html", columnDefinition = "TEXT")
    @Builder.Default
    private String resetPasswordBodyHtml = "";

    @Column(name = "created_at", nullable = false, updatable = false)
    @Builder.Default
    private Instant createdAt = Instant.now();

    @Column(name = "updated_at")
    private Instant updatedAt;

    @PrePersist
    void onCreate() {
        if (createdAt == null) createdAt = Instant.now();
        if (updatedAt == null) updatedAt = Instant.now();
    }

    @PreUpdate
    void onUpdate() {
        updatedAt = Instant.now();
    }
}
