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

    // Receipt layout
    @Builder.Default private int receiptLayout = 1;
    @Builder.Default private int receiptPaperSize = 80;

    // Receipt display toggles
    @Builder.Default private boolean showLogo = true;
    @Builder.Default private int logoSize = 60;
    @Builder.Default private boolean showStoreName = true;
    @Builder.Default private boolean showStoreAddress = true;
    @Builder.Default private boolean showStorePhone = true;
    @Builder.Default private boolean showStoreEmail = false;
    @Builder.Default private boolean showReference = true;
    @Builder.Default private boolean showDate = true;
    @Builder.Default private boolean showSeller = false;
    @Builder.Default private boolean showCustomer = true;
    @Builder.Default private boolean showWarehouse = false;
    @Builder.Default private boolean showTax = true;
    @Builder.Default private boolean showDiscount = true;
    @Builder.Default private boolean showShipping = false;
    @Builder.Default private boolean showBarcode = false;
    @Builder.Default private boolean showNote = false;
    @Builder.Default private boolean showPaid = true;
    @Builder.Default private boolean showDue = true;
    @Builder.Default private boolean showPayments = true;
    @Builder.Default private boolean showFooter = true;

    // Store info
    @Builder.Default private String storeName = "LetisPOS";
    @Builder.Default private String storeAddress = "";
    @Builder.Default private String storePhone = "";
    @Builder.Default private String storeEmail = "";
    @Builder.Default private String storeTaxId = "";
    @Builder.Default private String footerMessage = "Thank you for your business.";

    // Printing
    @Builder.Default private boolean autoPrint = true;

    // POS behaviour
    @Builder.Default private int productsPerPage = 24;

    // Tax defaults
    @Column(precision = 5, scale = 2)
    @Builder.Default private BigDecimal defaultTaxRate = BigDecimal.ZERO;

    @Builder.Default private String defaultTaxMethod = "EXCLUSIVE";

    // Currency
    @Builder.Default private String currencyCode = "TZS";
    @Builder.Default private String currencySymbol = "";

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
