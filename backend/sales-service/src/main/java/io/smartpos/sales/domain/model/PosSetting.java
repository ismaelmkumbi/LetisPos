package io.smartpos.sales.domain.model;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "pos_settings")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PosSetting {

    @Id
    @Column(length = 16, updatable = false, nullable = false)
    private UUID id;

    @Column(name = "warehouse_id", unique = true, nullable = false)
    private UUID warehouseId;

    // ── Receipt layout ───────────────────────────────────────────────────────
    @Builder.Default private int receiptLayout    = 1;
    @Builder.Default private int receiptPaperSize = 80;

    // ── Receipt display toggles ──────────────────────────────────────────────
    @Builder.Default private boolean showLogo         = true;
    @Builder.Default private int     logoSize         = 60;
    @Builder.Default private boolean showStoreName    = true;
    @Builder.Default private boolean showStoreAddress = true;
    @Builder.Default private boolean showStorePhone   = true;
    @Builder.Default private boolean showStoreEmail   = false;
    @Builder.Default private boolean showReference    = true;
    @Builder.Default private boolean showDate         = true;
    @Builder.Default private boolean showSeller       = false;
    @Builder.Default private boolean showCustomer     = true;
    @Builder.Default private boolean showWarehouse    = false;
    @Builder.Default private boolean showTax          = true;
    @Builder.Default private boolean showDiscount     = true;
    @Builder.Default private boolean showShipping     = false;
    @Builder.Default private boolean showBarcode      = false;
    @Builder.Default private boolean showNote         = false;
    @Builder.Default private boolean showPaid         = true;
    @Builder.Default private boolean showDue          = true;
    @Builder.Default private boolean showPayments     = true;
    @Builder.Default private boolean showFooter       = true;

    // ── Store info ───────────────────────────────────────────────────────────
    @Builder.Default private String storeName    = "LetisPOS";
    @Builder.Default private String storeAddress = "";
    @Builder.Default private String storePhone   = "";
    @Builder.Default private String storeEmail   = "";
    @Builder.Default private String storeTaxId   = "";
    @Builder.Default private String footerMessage = "Thank you for your business.";

    // ── Store branding (V8) ──────────────────────────────────────────────────
    @Builder.Default private String logoUrl      = "";
    @Builder.Default private String storeWebsite = "";

    // ── Printing ─────────────────────────────────────────────────────────────
    @Builder.Default private boolean autoPrint = true;

    // ── POS behaviour ────────────────────────────────────────────────────────
    @Builder.Default private int     productsPerPage       = 24;
    @Builder.Default private boolean allowNegativeStock    = false;
    @Builder.Default private boolean requireCustomerOnSale = false;
    @Builder.Default private boolean requireNoteOnSale     = false;
    @Builder.Default private int     lowStockThreshold     = 10;
    @Builder.Default private boolean enableSound           = true;
    @Builder.Default private int     kioskIdleTimeoutSec   = 120;

    // ── Sale reference numbering (V8) ────────────────────────────────────────
    @Builder.Default private String  saleRefPrefix  = "INV-";
    @Builder.Default private short   saleRefPadding = 4;

    // ── Tax defaults ─────────────────────────────────────────────────────────
    @Column(precision = 5, scale = 2)
    @Builder.Default private BigDecimal defaultTaxRate   = BigDecimal.ZERO;
    @Builder.Default private String     defaultTaxMethod = "EXCLUSIVE";

    // ── Discount & approval rules (V8) ───────────────────────────────────────
    @Column(precision = 5, scale = 2)
    @Builder.Default private BigDecimal maxDiscountPercent    = new BigDecimal("100.00");
    @Builder.Default private boolean    requirePinForDiscount = false;

    /** Amount threshold above which manager PIN is required. NULL = disabled. */
    @Column(precision = 12, scale = 2)
    private BigDecimal managerApprovalAbove;

    // ── Currency ─────────────────────────────────────────────────────────────
    @Builder.Default private String currencyCode   = "TZS";
    @Builder.Default private String currencySymbol = "";

    // ── Locale / regional (V8) ───────────────────────────────────────────────
    @Builder.Default private String timezone   = "Africa/Dar_es_Salaam";
    @Builder.Default private String dateFormat = "dd/MM/yyyy";
    @Builder.Default private String timeFormat = "HH:mm";

    // ── Loyalty programme (V8) ───────────────────────────────────────────────
    @Builder.Default private boolean    enableLoyalty          = false;
    @Column(precision = 8, scale = 4)
    @Builder.Default private BigDecimal loyaltyPointsPerUnit   = BigDecimal.ONE;
    @Column(precision = 8, scale = 4)
    @Builder.Default private BigDecimal loyaltyValuePerPoint   = new BigDecimal("0.0100");
    @Builder.Default private int        loyaltyMinRedeemPoints = 100;

    // ── Notifications / alerts (V8) ──────────────────────────────────────────
    @Builder.Default private boolean lowStockAlertEnabled = true;
    @Builder.Default private boolean dailySummaryEnabled  = false;
    @Builder.Default private String  alertEmail           = "";

    // ── Tenant ────────────────────────────────────────────────────────────────
    @Column(name = "tenant_id")
    private UUID tenantId;

    // ── Audit ────────────────────────────────────────────────────────────────
    @Column(updatable = false)
    private Instant createdAt;
    private Instant updatedAt;

    @PrePersist
    void prePersist() {
        if (id == null) id = UUID.randomUUID();
        createdAt = Instant.now();
        updatedAt = Instant.now();
    }

    @PreUpdate
    void preUpdate() {
        updatedAt = Instant.now();
    }
}
