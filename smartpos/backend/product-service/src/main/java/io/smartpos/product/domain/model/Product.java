package io.smartpos.product.domain.model;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.SQLRestriction;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

/**
 * Product aggregate root.
 *
 * {@link SQLRestriction} (Hibernate 6's replacement for {@code @Where}) keeps
 * soft-deleted rows out of every query automatically.
 */
@Entity
@Table(name = "products")
@SQLRestriction("deleted_at IS NULL")
@Getter @Setter
@NoArgsConstructor @AllArgsConstructor
@Builder
public class Product {

    @Id
    @Column(name = "id", nullable = false, updatable = false)
    private UUID id;

    @Column(name = "code", nullable = false)
    private String code;

    @Column(name = "name", nullable = false)
    private String name;

    @Column(name = "description")
    private String description;

    @Column(name = "category_id")     private UUID categoryId;
    @Column(name = "sub_category_id") private UUID subCategoryId;
    @Column(name = "brand_id")        private UUID brandId;
    @Column(name = "unit_id")         private UUID unitId;

    /** Default barcode symbology used when auto-generating a barcode. */
    @Column(name = "barcode_symbology", nullable = false, length = 16)
    @Builder.Default
    private String barcodeSymbology = "CODE128";

    @Column(name = "cost", nullable = false)
    @Builder.Default
    private BigDecimal cost = BigDecimal.ZERO;

    @Column(name = "price", nullable = false)
    @Builder.Default
    private BigDecimal price = BigDecimal.ZERO;

    /** Wholesale (B2B) tier — falls back to {@link #price} when null. */
    @Column(name = "wholesale_price")
    private BigDecimal wholesalePrice;

    /**
     * Minimum sellable price. Cashiers cannot apply discounts that take
     * the unit price below this floor. {@code null} means no floor.
     */
    @Column(name = "min_price")
    private BigDecimal minPrice;

    /** Loyalty points awarded per unit sold. */
    @Column(name = "points", nullable = false)
    @Builder.Default
    private int points = 0;

    @Enumerated(EnumType.STRING)
    @Column(name = "tax_method", nullable = false)
    @Builder.Default
    private TaxMethod taxMethod = TaxMethod.EXCLUSIVE;

    @Column(name = "tax_rate", nullable = false)
    @Builder.Default
    private BigDecimal taxRate = BigDecimal.ZERO;

    @Column(name = "stock_alert", nullable = false)
    @Builder.Default
    private int stockAlert = 0;

    @Column(name = "is_variant", nullable = false)
    @Builder.Default
    private boolean variant = false;

    @Enumerated(EnumType.STRING)
    @Column(name = "type", nullable = false)
    @Builder.Default
    private ProductType type = ProductType.STANDARD;

    @Column(name = "status", nullable = false)
    @Builder.Default
    private boolean status = true;

    @Column(name = "image_url")
    private String imageUrl;

    // ---- Stocky parity: warranty / dimensions / tracking ----

    /** Warranty term in months (manufacturer/seller cover). */
    @Column(name = "warranty_months")
    private Integer warrantyMonths;

    /** Guarantee term in months (return-for-replacement window). */
    @Column(name = "guarantee_months")
    private Integer guaranteeMonths;

    @Column(name = "length_cm")  private BigDecimal lengthCm;
    @Column(name = "width_cm")   private BigDecimal widthCm;
    @Column(name = "height_cm")  private BigDecimal heightCm;
    @Column(name = "weight_grams") private BigDecimal weightGrams;

    /** When TRUE, every inbound/outbound unit must carry a serial in product_serials. */
    @Column(name = "track_serial", nullable = false)
    @Builder.Default
    private boolean trackSerial = false;

    /** When TRUE, every unit must carry an IMEI (mobile-device tracking). */
    @Column(name = "track_imei", nullable = false)
    @Builder.Default
    private boolean trackImei = false;

    /** Hide from POS sale (but keep stock & history). Stocky's "disable from sale". */
    @Column(name = "sellable", nullable = false)
    @Builder.Default
    private boolean sellable = true;

    /** Marketing flag — surface on the storefront's "featured" rail. */
    @Column(name = "featured", nullable = false)
    @Builder.Default
    private boolean featured = false;

    /** Hide from the public online store but keep selling at the POS. */
    @Column(name = "hide_online", nullable = false)
    @Builder.Default
    private boolean hideOnline = false;

    @Column(name = "tenant_id")
    private UUID tenantId;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @Column(name = "deleted_at")
    private Instant deletedAt;

    @Version
    @Column(name = "version", nullable = false)
    private long version;

    @OneToMany(cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    @JoinColumn(name = "product_id")
    @Builder.Default
    private List<ProductVariant> variants = new ArrayList<>();

    @OneToMany(cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    @JoinColumn(name = "product_id")
    @Builder.Default
    private List<ProductBarcode> barcodes = new ArrayList<>();

    /** Bundle composition — populated when {@link #type} == COMBO. */
    @OneToMany(cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    @JoinColumn(name = "combo_product_id")
    @OrderBy("position ASC")
    @Builder.Default
    private List<ProductComboItem> comboItems = new ArrayList<>();

    @PrePersist
    void onCreate() {
        if (id == null) id = UUID.randomUUID();
        Instant now = Instant.now();
        if (createdAt == null) createdAt = now;
        updatedAt = now;
    }

    @PreUpdate
    void onUpdate() { updatedAt = Instant.now(); }

    /** Soft delete — SQLRestriction hides these rows from subsequent queries. */
    public void softDelete() {
        this.deletedAt = Instant.now();
        this.status = false;
    }

    public boolean isDeleted() { return deletedAt != null; }
}
