package io.smartpos.sales.domain.model;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "receipt_branding")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ReceiptBranding {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "tenant_id", unique = true, nullable = false)
    private UUID tenantId;

    @Column(name = "header_text", length = 255)
    @Builder.Default
    private String headerText = "";

    @Column(name = "footer_text", length = 500)
    @Builder.Default
    private String footerText = "";

    @Column(name = "show_logo")
    @Builder.Default
    private boolean showLogo = true;

    @Column(name = "logo_width_mm", precision = 4, scale = 1)
    @Builder.Default
    private BigDecimal logoWidthMm = BigDecimal.valueOf(48.0);

    @Column(name = "show_qr_code")
    @Builder.Default
    private boolean showQrCode = false;

    @Column(name = "show_barcode")
    @Builder.Default
    private boolean showBarcode = true;

    @Column(name = "show_customer_info")
    @Builder.Default
    private boolean showCustomerInfo = true;

    @Column(name = "paper_width_mm", length = 10)
    @Builder.Default
    private String paperWidthMm = "80";

    @Column(name = "font_size_small", precision = 3, scale = 1)
    @Builder.Default
    private BigDecimal fontSizeSmall = BigDecimal.valueOf(1.8);

    @Column(name = "font_size_normal", precision = 3, scale = 1)
    @Builder.Default
    private BigDecimal fontSizeNormal = BigDecimal.valueOf(2.2);

    @Column(name = "font_size_large", precision = 3, scale = 1)
    @Builder.Default
    private BigDecimal fontSizeLarge = BigDecimal.valueOf(3.0);

    @Column(name = "line_spacing", precision = 3, scale = 1)
    @Builder.Default
    private BigDecimal lineSpacing = BigDecimal.valueOf(1.2);

    @Column(name = "cut_paper_after_print")
    @Builder.Default
    private boolean cutPaperAfterPrint = true;

    @Column(name = "open_cash_drawer")
    @Builder.Default
    private boolean openCashDrawer = true;

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
