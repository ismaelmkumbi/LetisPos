# Vertical Module Architecture for LetisPos

## Executive Summary

This document describes the architecture for extending LetisPos with vertical-specific product attributes without bloating the core `Product` entity. A tenant can activate one or more verticals (e.g., pharmacy + supermarket), and each product may carry extension data for any active vertical. Adding a new vertical requires zero changes to core product code.

## Architecture Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Extension storage | JSONB column with typed DTOs | Flexibility + type safety. One table per vertical would create N tables per product. Pure EAV is slow and complex. JSONB strikes the balance. |
| Backend coupling | Interface + Spring bean registry | Zero compile-time dependency between core and vertical modules. Verticals register themselves at startup. |
| Frontend coupling | Registry + dynamic imports | Vertical-specific UI components are lazy-loaded. Core form does not import vertical code. |
| Multi-tenancy | Tenant-scoped vertical activation | Feature gate system (`feature_assignments`) already handles per-tenant feature toggling. Verticals reuse this mechanism. |
| Validation | Per-vertical validator chain | Each vertical contributes its own validator. Core runs the chain conditionally based on active verticals. |

---

## 1. Database Schema

### 1.1 New Tables

#### `vertical_definitions`
Registers available verticals. Populated at migration time, admin-managed.

```sql
CREATE TABLE vertical_definitions (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key             VARCHAR(50)  NOT NULL UNIQUE,  -- e.g. 'pharmacy', 'hardware', 'restaurant'
    label           VARCHAR(100) NOT NULL,         -- e.g. 'Pharmacy / Duka la Dawa'
    description     TEXT,
    category        VARCHAR(50)  NOT NULL DEFAULT 'vertical',
    feature_key     VARCHAR(100),                  -- links to feature_definitions.key for gating
    is_active       BOOLEAN      NOT NULL DEFAULT TRUE,
    sort_order      INT          NOT NULL DEFAULT 0,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ
);
```

#### `tenant_verticals`
Maps which verticals each tenant has activated.

```sql
CREATE TABLE tenant_verticals (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID         NOT NULL,
    vertical_key    VARCHAR(50)  NOT NULL,
    activated_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    activated_by    UUID,
    UNIQUE (tenant_id, vertical_key)
);
```

#### `product_vertical_extensions`
Stores extension data per product per vertical. JSONB allows each vertical to define its own schema.

```sql
CREATE TABLE product_vertical_extensions (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id      UUID         NOT NULL,
    vertical_key    VARCHAR(50)  NOT NULL,
    data            JSONB        NOT NULL DEFAULT '{}',
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ,
    UNIQUE (product_id, vertical_key),
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

CREATE INDEX idx_pve_product ON product_vertical_extensions(product_id);
CREATE INDEX idx_pve_vertical ON product_vertical_extensions(vertical_key);
CREATE INDEX idx_pve_data_gin ON product_vertical_extensions USING GIN(data);
```

#### `vertical_field_definitions` (optional, for frontend metadata)
Describes what fields a vertical expects, enabling UI to render without hardcoding.

```sql
CREATE TABLE vertical_field_definitions (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vertical_key    VARCHAR(50)  NOT NULL,
    field_key       VARCHAR(100) NOT NULL,
    field_type      VARCHAR(50)  NOT NULL,  -- 'string', 'number', 'boolean', 'date', 'enum', 'json'
    label           VARCHAR(255) NOT NULL,
    is_required     BOOLEAN      NOT NULL DEFAULT FALSE,
    validation_rule VARCHAR(255),           -- e.g. 'min:0', 'pattern:[A-Z]{2}-\\d{4}'
    sort_order      INT          NOT NULL DEFAULT 0,
    is_active       BOOLEAN      NOT NULL DEFAULT TRUE,
    UNIQUE (vertical_key, field_key)
);
```

### 1.2 Modified Tables

#### `products` (minimal — stripped of vertical-ambiguous fields)

Core fields that apply to ALL verticals stay on `products`. Fields that only matter to specific verticals are removed from `products` and moved into extensions (or remain if they are broadly applicable).

Fields to KEEP on `products` (universal):
- `id`, `code`, `name`, `description`, `type`, `status`, `sellable`, `featured`, `hide_online`
- `category_id`, `sub_category_id`, `brand_id`, `unit_id`, `supplier_id`
- `cost`, `price`, `wholesale_price`, `min_price`, `tax_method`, `tax_rate`
- `points`, `stock_alert`, `image_url`, `barcode_symbology`
- `tenant_id`, `created_at`, `updated_at`, `deleted_at`, `version`

Fields to MOVE into extensions (vertical-specific):
- `warranty_months`, `guarantee_months` → `hardware` extension
- `length_cm`, `width_cm`, `height_cm`, `weight_grams` → `hardware` or general `logistics` extension
- `track_serial`, `track_imei` → stay on product (broadly applicable, not truly vertical-specific)

> Note: For backward compatibility during migration, keep the columns on `products` initially but mark them deprecated. The extension JSONB can sync from/to these columns during the transition period.

### 1.3 Migration Scripts

```sql
-- V22__vertical_extensions.sql

-- 1. Vertical registry
CREATE TABLE vertical_definitions (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key             VARCHAR(50)  NOT NULL UNIQUE,
    label           VARCHAR(100) NOT NULL,
    description     TEXT,
    category        VARCHAR(50)  NOT NULL DEFAULT 'vertical',
    feature_key     VARCHAR(100),
    is_active       BOOLEAN      NOT NULL DEFAULT TRUE,
    sort_order      INT          NOT NULL DEFAULT 0,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ
);

-- Seed initial verticals
INSERT INTO vertical_definitions (key, label, description, feature_key, sort_order) VALUES
    ('pharmacy', 'Pharmacy / Duka la Dawa', 'Pharmaceutical products with Rx, batch, and expiry tracking', 'VERTICAL_PHARMACY', 10),
    ('hardware', 'Hardware / Vifaa', 'Tools, building materials, electronics with warranty and specs', 'VERTICAL_HARDWARE', 20),
    ('supermarket', 'Supermarket / Duka', 'Grocery and FMCG with shelf-life and weight tracking', 'VERTICAL_SUPERMARKET', 30),
    ('restaurant', 'Restaurant / Mlo', 'Food service with recipe costing and prep time', 'VERTICAL_RESTAURANT', 40);

-- 2. Tenant-vertical mapping
CREATE TABLE tenant_verticals (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID         NOT NULL,
    vertical_key    VARCHAR(50)  NOT NULL,
    activated_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    activated_by    UUID,
    UNIQUE (tenant_id, vertical_key)
);

-- 3. Product extension storage
CREATE TABLE product_vertical_extensions (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id      UUID         NOT NULL,
    vertical_key    VARCHAR(50)  NOT NULL,
    data            JSONB        NOT NULL DEFAULT '{}',
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ,
    UNIQUE (product_id, vertical_key)
);

CREATE INDEX idx_pve_product ON product_vertical_extensions(product_id);
CREATE INDEX idx_pve_vertical ON product_vertical_extensions(vertical_key);
CREATE INDEX idx_pve_data_gin ON product_vertical_extensions USING GIN(data);

-- 4. Field definitions for dynamic UI generation
CREATE TABLE vertical_field_definitions (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vertical_key    VARCHAR(50)  NOT NULL,
    field_key       VARCHAR(100) NOT NULL,
    field_type      VARCHAR(50)  NOT NULL,
    label           VARCHAR(255) NOT NULL,
    is_required     BOOLEAN      NOT NULL DEFAULT FALSE,
    validation_rule VARCHAR(255),
    sort_order      INT          NOT NULL DEFAULT 0,
    is_active       BOOLEAN      NOT NULL DEFAULT TRUE,
    UNIQUE (vertical_key, field_key)
);

-- Seed pharmacy fields
INSERT INTO vertical_field_definitions (vertical_key, field_key, field_type, label, is_required, validation_rule, sort_order) VALUES
    ('pharmacy', 'rx_required', 'boolean', 'Prescription Required', TRUE, NULL, 10),
    ('pharmacy', 'batch_number', 'string', 'Batch Number', FALSE, 'max:50', 20),
    ('pharmacy', 'expiry_date', 'date', 'Expiry Date', FALSE, 'future', 30),
    ('pharmacy', 'manufacture_date', 'date', 'Manufacture Date', FALSE, NULL, 40),
    ('pharmacy', 'storage_conditions', 'enum', 'Storage Conditions', FALSE, 'enum:room_temp,refrigerated,frozen', 50),
    ('pharmacy', 'dosage_form', 'enum', 'Dosage Form', FALSE, 'enum:tablet,capsule,syrup,injection,cream,ointment,powder', 60),
    ('pharmacy', 'strength', 'string', 'Strength / Concentration', FALSE, 'max:100', 70),
    ('pharmacy', 'generic_name', 'string', 'Generic Name', FALSE, 'max:255', 80),
    ('pharmacy', 'atc_code', 'string', 'ATC Code', FALSE, 'pattern:[A-Z]\\d{2}[A-Z]{2}\\d{2}', 90),
    ('pharmacy', 'nda_registration', 'string', 'NDA/TFDA Registration', FALSE, 'max:100', 100);

-- Seed hardware fields
INSERT INTO vertical_field_definitions (vertical_key, field_key, field_type, label, is_required, validation_rule, sort_order) VALUES
    ('hardware', 'warranty_months', 'number', 'Warranty (months)', FALSE, 'min:0', 10),
    ('hardware', 'guarantee_months', 'number', 'Guarantee (months)', FALSE, 'min:0', 20),
    ('hardware', 'length_cm', 'number', 'Length (cm)', FALSE, 'min:0', 30),
    ('hardware', 'width_cm', 'number', 'Width (cm)', FALSE, 'min:0', 40),
    ('hardware', 'height_cm', 'number', 'Height (cm)', FALSE, 'min:0', 50),
    ('hardware', 'weight_grams', 'number', 'Weight (grams)', FALSE, 'min:0', 60),
    ('hardware', 'material', 'string', 'Material', FALSE, 'max:100', 70),
    ('hardware', 'country_of_origin', 'string', 'Country of Origin', FALSE, 'max:100', 80),
    ('hardware', 'power_watts', 'number', 'Power (W)', FALSE, 'min:0', 90),
    ('hardware', 'voltage', 'string', 'Voltage', FALSE, 'max:50', 100),
    ('hardware', 'specifications', 'json', 'Technical Specifications', FALSE, NULL, 110);

-- Seed supermarket fields
INSERT INTO vertical_field_definitions (vertical_key, field_key, field_type, label, is_required, validation_rule, sort_order) VALUES
    ('supermarket', 'shelf_life_days', 'number', 'Shelf Life (days)', FALSE, 'min:0', 10),
    ('supermarket', 'allergen_info', 'string', 'Allergen Information', FALSE, 'max:500', 20),
    ('supermarket', 'nutritional_info', 'json', 'Nutritional Information', FALSE, NULL, 30),
    ('supermarket', 'organic_certified', 'boolean', 'Organic Certified', FALSE, NULL, 40),
    ('supermarket', 'halal_certified', 'boolean', 'Halal Certified', FALSE, NULL, 50);

-- Seed restaurant fields
INSERT INTO vertical_field_definitions (vertical_key, field_key, field_type, label, is_required, validation_rule, sort_order) VALUES
    ('restaurant', 'prep_time_minutes', 'number', 'Prep Time (minutes)', FALSE, 'min:0', 10),
    ('restaurant', 'recipe_cost', 'number', 'Recipe Cost', FALSE, 'min:0', 20),
    ('restaurant', 'serving_size', 'string', 'Serving Size', FALSE, 'max:100', 30),
    ('restaurant', 'is_vegetarian', 'boolean', 'Vegetarian', FALSE, NULL, 40),
    ('restaurant', 'is_spicy', 'boolean', 'Spicy', FALSE, NULL, 50),
    ('restaurant', 'recipe_ingredients', 'json', 'Recipe Ingredients', FALSE, NULL, 60);
```

---

## 2. Backend Entity Model (Java)

### 2.1 Core Entities (Minimal Changes)

The `Product` entity stays minimal. Extension data is loaded on demand via a separate service.

#### `Product.java` (stripped — no new fields)

```java
package io.smartpos.product.domain.model;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.SQLRestriction;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

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
    @Column(name = "supplier_id")     private UUID supplierId;

    @Column(name = "barcode_symbology", nullable = false, length = 16)
    @Builder.Default
    private String barcodeSymbology = "CODE128";

    @Column(name = "cost", nullable = false)
    @Builder.Default
    private BigDecimal cost = BigDecimal.ZERO;

    @Column(name = "price", nullable = false)
    @Builder.Default
    private BigDecimal price = BigDecimal.ZERO;

    @Column(name = "wholesale_price")
    private BigDecimal wholesalePrice;

    @Column(name = "min_price")
    private BigDecimal minPrice;

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

    // Universal tracking flags (not truly vertical-specific)
    @Column(name = "track_serial", nullable = false)
    @Builder.Default
    private boolean trackSerial = false;

    @Column(name = "track_imei", nullable = false)
    @Builder.Default
    private boolean trackImei = false;

    @Column(name = "sellable", nullable = false)
    @Builder.Default
    private boolean sellable = true;

    @Column(name = "featured", nullable = false)
    @Builder.Default
    private boolean featured = false;

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

    // Relations
    @OneToMany(cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    @JoinColumn(name = "product_id")
    @Builder.Default
    private List<ProductVariant> variants = new ArrayList<>();

    @OneToMany(cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    @JoinColumn(name = "product_id")
    @Builder.Default
    private List<ProductBarcode> barcodes = new ArrayList<>();

    @OneToMany(cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    @JoinColumn(name = "combo_product_id")
    @OrderBy("position ASC")
    @Builder.Default
    private List<ProductComboItem> comboItems = new ArrayList<>();

    // Extension data is NOT a direct relation — loaded on demand via VerticalExtensionService
    // to avoid N+1 and keep the product table lean.

    @PrePersist
    void onCreate() {
        if (id == null) id = UUID.randomUUID();
        Instant now = Instant.now();
        if (createdAt == null) createdAt = now;
        updatedAt = now;
    }

    @PreUpdate
    void onUpdate() { updatedAt = Instant.now(); }

    public void softDelete() {
        this.deletedAt = Instant.now();
        this.status = false;
    }

    public boolean isDeleted() { return deletedAt != null; }
}
```

### 2.2 Vertical Extension Framework

#### `VerticalExtension.java` — Interface every vertical implements

```java
package io.smartpos.product.domain.vertical;

import com.fasterxml.jackson.databind.JsonNode;
import io.smartpos.product.domain.model.Product;
import java.util.Set;

/**
 * Contract for a vertical extension module.
 *
 * Each vertical (pharmacy, hardware, etc.) implements this interface
 * and registers itself as a Spring bean. The core product service
 * discovers verticals at runtime — no compile-time dependency.
 */
public interface VerticalExtension {

    /** Unique key, matching vertical_definitions.key */
    String getKey();

    /** Human-readable label */
    String getLabel();

    /** Feature key required for this vertical to be active (null = always available) */
    default String getRequiredFeatureKey() { return null; }

    /** Validate extension data when saving a product. Throw ValidationException on failure. */
    void validate(Product product, JsonNode extensionData);

    /** Called after a product is created. Use for side effects (e.g., pharmacy batch registration). */
    default void onProductCreated(Product product, JsonNode extensionData) {}

    /** Called after a product is updated. */
    default void onProductUpdated(Product product, JsonNode extensionData) {}

    /** Called after a product is deleted (soft or hard). */
    default void onProductDeleted(Product product) {}

    /** Return the DTO class used to deserialize extension data for this vertical. */
    Class<?> getExtensionDtoClass();

    /** Return field definitions for dynamic UI generation. */
    default Set<VerticalFieldDef> getFieldDefinitions() { return Set.of(); }

    /** Whether this product should show this vertical's fields by default. */
    default boolean isApplicable(Product product) { return true; }
}
```

#### `VerticalFieldDef.java` — Field metadata for dynamic forms

```java
package io.smartpos.product.domain.vertical;

public record VerticalFieldDef(
    String fieldKey,
    String fieldType,   // string, number, boolean, date, enum, json
    String label,
    boolean required,
    String validationRule,
    int sortOrder
) {}
```

#### `VerticalRegistry.java` — Runtime discovery

```java
package io.smartpos.product.application;

import io.smartpos.product.domain.vertical.VerticalExtension;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.*;

@Component
@RequiredArgsConstructor
public class VerticalRegistry {

    private final List<VerticalExtension> extensions;
    private final Map<String, VerticalExtension> byKey = new HashMap<>();

    @PostConstruct
    void index() {
        for (VerticalExtension ext : extensions) {
            byKey.put(ext.getKey(), ext);
        }
    }

    public Optional<VerticalExtension> get(String key) {
        return Optional.ofNullable(byKey.get(key));
    }

    public Collection<VerticalExtension> all() {
        return byKey.values();
    }

    public boolean has(String key) {
        return byKey.containsKey(key);
    }
}
```

#### `VerticalExtensionEntity.java` — JPA entity for extension storage

```java
package io.smartpos.product.domain.model;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "product_vertical_extensions")
@Getter @Setter
@NoArgsConstructor @AllArgsConstructor
@Builder
public class ProductVerticalExtension {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "product_id", nullable = false)
    private UUID productId;

    @Column(name = "vertical_key", nullable = false, length = 50)
    private String verticalKey;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "data", columnDefinition = "jsonb", nullable = false)
    private Object data;  // Use Object to allow Jackson to serialize/deserialize

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at")
    private Instant updatedAt;

    @PrePersist
    void onCreate() {
        Instant now = Instant.now();
        if (createdAt == null) createdAt = now;
        updatedAt = now;
    }

    @PreUpdate
    void onUpdate() { updatedAt = Instant.now(); }
}
```

#### `ProductVerticalExtensionRepository.java`

```java
package io.smartpos.product.domain.repository;

import io.smartpos.product.domain.model.ProductVerticalExtension;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ProductVerticalExtensionRepository
        extends JpaRepository<ProductVerticalExtension, UUID> {

    List<ProductVerticalExtension> findByProductId(UUID productId);
    Optional<ProductVerticalExtension> findByProductIdAndVerticalKey(UUID productId, String verticalKey);
    void deleteByProductIdAndVerticalKey(UUID productId, String verticalKey);
}
```

### 2.3 Extension DTOs (Per Vertical)

#### `PharmacyExtensionDto.java`

```java
package io.smartpos.product.domain.vertical.pharmacy;

import jakarta.validation.constraints.*;
import java.time.LocalDate;

public record PharmacyExtensionDto(
    @NotNull Boolean rxRequired,
    @Size(max = 50) String batchNumber,
    @Future LocalDate expiryDate,
    LocalDate manufactureDate,
    StorageCondition storageConditions,
    DosageForm dosageForm,
    @Size(max = 100) String strength,
    @Size(max = 255) String genericName,
    @Pattern(regexp = "[A-Z]\\d{2}[A-Z]{2}\\d{2}", message = "Invalid ATC code format")
    String atcCode,
    @Size(max = 100) String ndaRegistration
) {
    public enum StorageCondition { ROOM_TEMP, REFRIGERATED, FROZEN }
    public enum DosageForm { TABLET, CAPSULE, SYRUP, INJECTION, CREAM, OINTMENT, POWDER }
}
```

#### `HardwareExtensionDto.java`

```java
package io.smartpos.product.domain.vertical.hardware;

import jakarta.validation.constraints.*;
import java.math.BigDecimal;
import java.util.Map;

public record HardwareExtensionDto(
    @Min(0) Integer warrantyMonths,
    @Min(0) Integer guaranteeMonths,
    @DecimalMin("0.0") BigDecimal lengthCm,
    @DecimalMin("0.0") BigDecimal widthCm,
    @DecimalMin("0.0") BigDecimal heightCm,
    @DecimalMin("0.0") BigDecimal weightGrams,
    @Size(max = 100) String material,
    @Size(max = 100) String countryOfOrigin,
    @Min(0) Integer powerWatts,
    @Size(max = 50) String voltage,
    Map<String, String> specifications
) {}
```

#### `RestaurantExtensionDto.java`

```java
package io.smartpos.product.domain.vertical.restaurant;

import jakarta.validation.constraints.*;
import java.math.BigDecimal;
import java.util.List;

public record RestaurantExtensionDto(
    @Min(0) Integer prepTimeMinutes,
    @DecimalMin("0.0") BigDecimal recipeCost,
    @Size(max = 100) String servingSize,
    Boolean isVegetarian,
    Boolean isSpicy,
    List<RecipeIngredient> recipeIngredients
) {
    public record RecipeIngredient(
        @NotBlank String ingredientName,
        @DecimalMin("0.0") BigDecimal qty,
        @NotBlank String unit
    ) {}
}
```

### 2.4 Vertical Implementation Example — Pharmacy

#### `PharmacyVerticalExtension.java`

```java
package io.smartpos.product.domain.vertical.pharmacy;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.smartpos.product.domain.model.Product;
import io.smartpos.product.domain.vertical.VerticalExtension;
import io.smartpos.product.domain.vertical.VerticalFieldDef;
import lombok.RequiredArgsConstructor;
import lombok.SneakyThrows;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;

import java.util.Set;

import static org.springframework.http.HttpStatus.BAD_REQUEST;

@Component
@RequiredArgsConstructor
public class PharmacyVerticalExtension implements VerticalExtension {

    private final ObjectMapper objectMapper;

    @Override
    public String getKey() { return "pharmacy"; }

    @Override
    public String getLabel() { return "Pharmacy / Duka la Dawa"; }

    @Override
    public String getRequiredFeatureKey() { return "VERTICAL_PHARMACY"; }

    @Override
    @SneakyThrows
    public void validate(Product product, JsonNode data) {
        if (data == null || data.isNull() || data.isEmpty()) return;

        PharmacyExtensionDto dto = objectMapper.treeToValue(data, PharmacyExtensionDto.class);

        // Pharmacy-specific business rules
        if (Boolean.TRUE.equals(dto.rxRequired()) && dto.strength() == null) {
            throw new ResponseStatusException(BAD_REQUEST,
                "Prescription-required products must have a strength specified");
        }
        if (dto.expiryDate() != null && dto.manufactureDate() != null
                && !dto.expiryDate().isAfter(dto.manufactureDate())) {
            throw new ResponseStatusException(BAD_REQUEST,
                "Expiry date must be after manufacture date");
        }
        // NDA registration must be present for all pharmacy products in TZ
        if (dto.ndaRegistration() == null || dto.ndaRegistration().isBlank()) {
            throw new ResponseStatusException(BAD_REQUEST,
                "NDA/TFDA registration number is required for pharmaceutical products");
        }
    }

    @Override
    public Class<?> getExtensionDtoClass() { return PharmacyExtensionDto.class; }

    @Override
    public Set<VerticalFieldDef> getFieldDefinitions() {
        return Set.of(
            new VerticalFieldDef("rxRequired", "boolean", "Prescription Required", true, null, 10),
            new VerticalFieldDef("batchNumber", "string", "Batch Number", false, "max:50", 20),
            new VerticalFieldDef("expiryDate", "date", "Expiry Date", false, "future", 30),
            new VerticalFieldDef("manufactureDate", "date", "Manufacture Date", false, null, 40),
            new VerticalFieldDef("storageConditions", "enum", "Storage Conditions", false,
                "enum:room_temp,refrigerated,frozen", 50),
            new VerticalFieldDef("dosageForm", "enum", "Dosage Form", false,
                "enum:tablet,capsule,syrup,injection,cream,ointment,powder", 60),
            new VerticalFieldDef("strength", "string", "Strength / Concentration", false, "max:100", 70),
            new VerticalFieldDef("genericName", "string", "Generic Name", false, "max:255", 80),
            new VerticalFieldDef("atcCode", "string", "ATC Code", false, "pattern:[A-Z]\\d{2}[A-Z]{2}\\d{2}", 90),
            new VerticalFieldDef("ndaRegistration", "string", "NDA/TFDA Registration", true, "max:100", 100)
        );
    }

    @Override
    public boolean isApplicable(Product product) {
        // Only applicable to standard products, not services or combos
        return product.getType().name().equals("STANDARD");
    }
}
```

#### `HardwareVerticalExtension.java`

```java
package io.smartpos.product.domain.vertical.hardware;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.smartpos.product.domain.model.Product;
import io.smartpos.product.domain.vertical.VerticalExtension;
import io.smartpos.product.domain.vertical.VerticalFieldDef;
import lombok.RequiredArgsConstructor;
import lombok.SneakyThrows;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;

import java.util.Set;

import static org.springframework.http.HttpStatus.BAD_REQUEST;

@Component
@RequiredArgsConstructor
public class HardwareVerticalExtension implements VerticalExtension {

    private final ObjectMapper objectMapper;

    @Override
    public String getKey() { return "hardware"; }

    @Override
    public String getLabel() { return "Hardware / Vifaa"; }

    @Override
    public String getRequiredFeatureKey() { return "VERTICAL_HARDWARE"; }

    @Override
    @SneakyThrows
    public void validate(Product product, JsonNode data) {
        if (data == null || data.isNull() || data.isEmpty()) return;

        HardwareExtensionDto dto = objectMapper.treeToValue(data, HardwareExtensionDto.class);

        // If any dimension is present, all should be present for consistency
        boolean hasAnyDim = dto.lengthCm() != null || dto.widthCm() != null || dto.heightCm() != null;
        boolean hasAllDim = dto.lengthCm() != null && dto.widthCm() != null && dto.heightCm() != null;
        if (hasAnyDim && !hasAllDim) {
            throw new ResponseStatusException(BAD_REQUEST,
                "All dimensions (length, width, height) must be specified together");
        }

        // Voltage must match known patterns if provided
        if (dto.voltage() != null && !dto.voltage().matches("\\d{2,3}V")) {
            throw new ResponseStatusException(BAD_REQUEST,
                "Voltage must be in format like '110V' or '220V'");
        }
    }

    @Override
    public Class<?> getExtensionDtoClass() { return HardwareExtensionDto.class; }

    @Override
    public Set<VerticalFieldDef> getFieldDefinitions() {
        return Set.of(
            new VerticalFieldDef("warrantyMonths", "number", "Warranty (months)", false, "min:0", 10),
            new VerticalFieldDef("guaranteeMonths", "number", "Guarantee (months)", false, "min:0", 20),
            new VerticalFieldDef("lengthCm", "number", "Length (cm)", false, "min:0", 30),
            new VerticalFieldDef("widthCm", "number", "Width (cm)", false, "min:0", 40),
            new VerticalFieldDef("heightCm", "number", "Height (cm)", false, "min:0", 50),
            new VerticalFieldDef("weightGrams", "number", "Weight (grams)", false, "min:0", 60),
            new VerticalFieldDef("material", "string", "Material", false, "max:100", 70),
            new VerticalFieldDef("countryOfOrigin", "string", "Country of Origin", false, "max:100", 80),
            new VerticalFieldDef("powerWatts", "number", "Power (W)", false, "min:0", 90),
            new VerticalFieldDef("voltage", "string", "Voltage", false, "max:50", 100),
            new VerticalFieldDef("specifications", "json", "Technical Specifications", false, null, 110)
        );
    }
}
```

### 2.5 Vertical Extension Service

#### `VerticalExtensionService.java`

```java
package io.smartpos.product.application;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.smartpos.common.context.TenantContext;
import io.smartpos.product.domain.model.Product;
import io.smartpos.product.domain.model.ProductVerticalExtension;
import io.smartpos.product.domain.repository.ProductVerticalExtensionRepository;
import io.smartpos.product.domain.vertical.VerticalExtension;
import lombok.RequiredArgsConstructor;
import lombok.SneakyThrows;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class VerticalExtensionService {

    private final ProductVerticalExtensionRepository extRepo;
    private final VerticalRegistry registry;
    private final ObjectMapper objectMapper;
    private final TenantVerticalService tenantVerticalService;

    /** Load all extension data for a product. */
    @Transactional(readOnly = true)
    public Map<String, JsonNode> loadAll(UUID productId) {
        return extRepo.findByProductId(productId).stream()
            .collect(Collectors.toMap(
                ProductVerticalExtension::getVerticalKey,
                ext -> readAsTree(ext.getData())
            ));
    }

    /** Load extension data for a specific vertical. */
    @Transactional(readOnly = true)
    public Optional<JsonNode> load(UUID productId, String verticalKey) {
        return extRepo.findByProductIdAndVerticalKey(productId, verticalKey)
            .map(ext -> readAsTree(ext.getData()));
    }

    /** Save extension data for a product. Validates against the vertical's rules. */
    @Transactional
    public void saveAll(Product product, Map<String, JsonNode> extensions) {
        UUID tenantId = product.getTenantId();
        Set<String> activeVerticals = tenantVerticalService.getActiveVerticalKeys(tenantId);

        for (Map.Entry<String, JsonNode> entry : extensions.entrySet()) {
            String vKey = entry.getKey();
            JsonNode data = entry.getValue();

            // Skip if vertical not active for this tenant
            if (!activeVerticals.contains(vKey)) {
                log.warn("Skipping extension for inactive vertical {} on product {}", vKey, product.getId());
                continue;
            }

            // Find and validate
            VerticalExtension ext = registry.get(vKey)
                .orElseThrow(() -> new IllegalArgumentException("Unknown vertical: " + vKey));

            ext.validate(product, data);

            // Upsert
            ProductVerticalExtension existing = extRepo
                .findByProductIdAndVerticalKey(product.getId(), vKey)
                .orElse(null);

            if (data == null || data.isNull() || data.isEmpty()) {
                if (existing != null) {
                    extRepo.delete(existing);
                }
                continue;
            }

            if (existing != null) {
                existing.setData(writeAsObject(data));
                extRepo.save(existing);
            } else {
                extRepo.save(ProductVerticalExtension.builder()
                    .productId(product.getId())
                    .verticalKey(vKey)
                    .data(writeAsObject(data))
                    .build());
            }

            // Trigger lifecycle hooks
            ext.onProductUpdated(product, data);
        }
    }

    /** Delete all extensions for a product (called on soft-delete). */
    @Transactional
    public void deleteAll(UUID productId) {
        List<ProductVerticalExtension> exts = extRepo.findByProductId(productId);
        for (ProductVerticalExtension ext : exts) {
            registry.get(ext.getVerticalKey()).ifPresent(v -> {
                // Note: would need the Product object for the hook; simplified here
            });
        }
        extRepo.deleteAll(exts);
    }

    // ----------------------------------------------------------------
    // helpers
    // ----------------------------------------------------------------

    @SneakyThrows
    private JsonNode readAsTree(Object data) {
        if (data instanceof JsonNode j) return j;
        if (data instanceof String s) return objectMapper.readTree(s);
        return objectMapper.valueToTree(data);
    }

    @SneakyThrows
    private Object writeAsObject(JsonNode node) {
        return objectMapper.treeToValue(node, Object.class);
    }
}
```

#### `TenantVerticalService.java`

```java
package io.smartpos.product.application;

import io.smartpos.common.context.TenantContext;
import io.smartpos.product.domain.model.ProductVerticalExtension;
import org.springframework.stereotype.Service;

import java.util.Set;
import java.util.UUID;

@Service
public class TenantVerticalService {

    /** Returns the set of vertical keys active for the current tenant. */
    public Set<String> getActiveVerticalKeys(UUID tenantId) {
        // In production: query tenant_verticals table or user-service API
        // For now, fall back to feature-based resolution
        // This could be cached in Redis per tenant
        return Set.of(); // TODO: implement
    }

    /** Check if a specific vertical is active. */
    public boolean isVerticalActive(String verticalKey) {
        UUID tenantId = TenantContext.get().orElse(null);
        if (tenantId == null) return false;
        return getActiveVerticalKeys(tenantId).contains(verticalKey);
    }
}
```

### 2.6 Modified Product Service

The `ProductService` delegates extension handling to `VerticalExtensionService`.

```java
// In ProductService.java — modified methods

@Transactional
public ProductDto create(CreateProductRequest req) {
    // ... existing product creation code ...

    Product saved = productRepo.save(p);

    // Handle vertical extensions
    if (req.extensions() != null && !req.extensions().isEmpty()) {
        verticalExtensionService.saveAll(saved, req.extensions());
    }

    emit("ProductCreated", saved);
    return ProductDto.from(saved, verticalExtensionService.loadAll(saved.getId()));
}

@Transactional
public ProductDto update(UUID id, UpdateProductRequest req, UUID userId) {
    // ... existing update code ...

    Product saved = productRepo.save(p);

    // Handle vertical extensions
    if (req.extensions() != null) {
        verticalExtensionService.saveAll(saved, req.extensions());
    }

    emit("ProductUpdated", saved);
    return ProductDto.from(saved, verticalExtensionService.loadAll(saved.getId()));
}
```

### 2.7 Modified DTOs

#### `ProductDto.java` (with extensions)

```java
package io.smartpos.product.api.dto;

import com.fasterxml.jackson.databind.JsonNode;
import io.smartpos.product.domain.model.Product;
import io.smartpos.product.domain.model.ProductType;
import io.smartpos.product.domain.model.TaxMethod;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

public record ProductDto(
        UUID id,
        String code,
        String name,
        String description,
        UUID categoryId,
        UUID subCategoryId,
        UUID brandId,
        UUID unitId,
        UUID supplierId,
        BigDecimal cost,
        BigDecimal price,
        BigDecimal wholesalePrice,
        BigDecimal minPrice,
        Integer points,
        TaxMethod taxMethod,
        BigDecimal taxRate,
        int stockAlert,
        boolean variant,
        ProductType type,
        boolean status,
        boolean sellable,
        boolean featured,
        boolean hideOnline,
        String imageUrl,
        String barcodeSymbology,
        boolean trackSerial,
        boolean trackImei,
        List<VariantDto> variants,
        List<BarcodeDto> barcodes,
        List<ComboItemDto> comboItems,
        // Vertical extensions — keyed by vertical key
        Map<String, JsonNode> extensions,
        Instant createdAt,
        Instant updatedAt
) {
    // Overload: without extensions (for backward compat)
    public static ProductDto from(Product p) {
        return from(p, Map.of());
    }

    public static ProductDto from(Product p, Map<String, JsonNode> extensions) {
        return new ProductDto(
                p.getId(), p.getCode(), p.getName(), p.getDescription(),
                p.getCategoryId(), p.getSubCategoryId(), p.getBrandId(), p.getUnitId(), p.getSupplierId(),
                p.getCost(), p.getPrice(),
                p.getWholesalePrice(), p.getMinPrice(), p.getPoints(),
                p.getTaxMethod(), p.getTaxRate(),
                p.getStockAlert(), p.isVariant(), p.getType(), p.isStatus(),
                p.isSellable(), p.isFeatured(), p.isHideOnline(),
                p.getImageUrl(), p.getBarcodeSymbology(),
                p.isTrackSerial(), p.isTrackImei(),
                p.getVariants().stream().map(VariantDto::from).collect(Collectors.toList()),
                p.getBarcodes().stream().map(BarcodeDto::from).collect(Collectors.toList()),
                p.getComboItems().stream().map(ComboItemDto::from).collect(Collectors.toList()),
                extensions,
                p.getCreatedAt(), p.getUpdatedAt()
        );
    }
}
```

#### `CreateProductRequest.java` (with extensions)

```java
package io.smartpos.product.api.dto;

import com.fasterxml.jackson.databind.JsonNode;
import io.smartpos.product.domain.model.ProductType;
import io.smartpos.product.domain.model.TaxMethod;
import jakarta.validation.constraints.*;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import java.util.UUID;

public record CreateProductRequest(
        @Size(max = 64) String code,
        @NotBlank @Size(max = 255) String name,
        String description,
        UUID categoryId,
        UUID subCategoryId,
        UUID brandId,
        UUID unitId,
        UUID supplierId,
        @NotNull @DecimalMin("0.0") BigDecimal cost,
        @NotNull @DecimalMin("0.0") BigDecimal price,
        @DecimalMin("0.0") BigDecimal wholesalePrice,
        @DecimalMin("0.0") BigDecimal minPrice,
        @Min(0) Integer points,
        TaxMethod taxMethod,
        @DecimalMin("0.0") BigDecimal taxRate,
        @Min(0) Integer stockAlert,
        ProductType type,
        Boolean status,
        Boolean sellable,
        Boolean featured,
        Boolean hideOnline,
        String imageUrl,
        @Size(max = 16) String barcodeSymbology,
        Boolean trackSerial,
        Boolean trackImei,
        // Relations
        List<VariantInput> variants,
        List<BarcodeInput> barcodes,
        List<ComboItemInput> comboItems,
        // Vertical extensions — keyed by vertical key (e.g., "pharmacy", "hardware")
        Map<String, JsonNode> extensions
) {
    public record VariantInput(...) {}
    public record BarcodeInput(...) {}
    public record ComboItemInput(...) {}
}
```

---

## 3. Frontend Approach (React)

### 3.1 Vertical Context

A React context provides the tenant's active verticals to the entire app.

```typescript
// src/context/smartpos/VerticalContext.tsx
import { createContext, useContext, useEffect, useState } from 'react';

export interface Vertical {
  key: string;
  label: string;
  featureKey: string | null;
}

interface VerticalContextValue {
  activeVerticals: Vertical[];
  hasVertical: (key: string) => boolean;
  hasAnyVertical: (keys: string[]) => boolean;
  isLoading: boolean;
}

const VerticalContext = createContext<VerticalContextValue>({
  activeVerticals: [],
  hasVertical: () => false,
  hasAnyVertical: () => false,
  isLoading: true,
});

export function VerticalProvider({ children }: { children: React.ReactNode }) {
  const [activeVerticals, setActiveVerticals] = useState<Vertical[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Fetch from /api/v1/tenants/me/verticals or derive from user features
    // For now, derive from features
    const features = (window as any).__TENANT_FEATURES__ ?? [];
    const verticals: Vertical[] = [];
    if (features.includes('VERTICAL_PHARMACY')) {
      verticals.push({ key: 'pharmacy', label: 'Pharmacy', featureKey: 'VERTICAL_PHARMACY' });
    }
    if (features.includes('VERTICAL_HARDWARE')) {
      verticals.push({ key: 'hardware', label: 'Hardware', featureKey: 'VERTICAL_HARDWARE' });
    }
    if (features.includes('VERTICAL_SUPERMARKET')) {
      verticals.push({ key: 'supermarket', label: 'Supermarket', featureKey: 'VERTICAL_SUPERMARKET' });
    }
    if (features.includes('VERTICAL_RESTAURANT')) {
      verticals.push({ key: 'restaurant', label: 'Restaurant', featureKey: 'VERTICAL_RESTAURANT' });
    }
    setActiveVerticals(verticals);
    setIsLoading(false);
  }, []);

  const hasVertical = (key: string) => activeVerticals.some((v) => v.key === key);
  const hasAnyVertical = (keys: string[]) => keys.some((k) => hasVertical(k));

  return (
    <VerticalContext.Provider value={{ activeVerticals, hasVertical, hasAnyVertical, isLoading }}>
      {children}
    </VerticalContext.Provider>
  );
}

export function useVerticals() {
  const ctx = useContext(VerticalContext);
  if (!ctx) throw new Error('useVerticals must be used within VerticalProvider');
  return ctx;
}
```

### 3.2 Vertical Field Registry

A registry maps vertical keys to their form components and validation rules.

```typescript
// src/views/smartpos/products/verticals/registry.ts
import type { ComponentType } from 'react';

export interface VerticalFormProps {
  data: Record<string, unknown>;
  onChange: (data: Record<string, unknown>) => void;
  errors?: Record<string, string>;
}

export interface VerticalFieldConfig {
  key: string;
  label: string;
  component: ComponentType<VerticalFormProps>;
  sortOrder: number;
}

const registry = new Map<string, VerticalFieldConfig[]>();

export function registerVerticalFields(verticalKey: string, fields: VerticalFieldConfig[]) {
  registry.set(verticalKey, fields);
}

export function getVerticalFields(verticalKey: string): VerticalFieldConfig[] {
  return registry.get(verticalKey) ?? [];
}

export function getAllRegisteredVerticals(): string[] {
  return Array.from(registry.keys());
}
```

### 3.3 Pharmacy Extension Form Component

```typescript
// src/views/smartpos/products/verticals/PharmacyExtensionForm.tsx
import { useState } from 'react';
import {
  Box, FormControlLabel, MenuItem, Stack, Switch, TextField, Typography,
} from '@mui/material';
import { brand } from 'src/theme/smartpos/brand';
import type { VerticalFormProps } from './registry';

interface PharmacyData {
  rxRequired?: boolean;
  batchNumber?: string;
  expiryDate?: string;
  manufactureDate?: string;
  storageConditions?: 'room_temp' | 'refrigerated' | 'frozen';
  dosageForm?: 'tablet' | 'capsule' | 'syrup' | 'injection' | 'cream' | 'ointment' | 'powder';
  strength?: string;
  genericName?: string;
  atcCode?: string;
  ndaRegistration?: string;
}

export default function PharmacyExtensionForm({ data, onChange, errors = {} }: VerticalFormProps) {
  const [values, setValues] = useState<PharmacyData>(data as PharmacyData);

  const patch = <K extends keyof PharmacyData>(key: K, value: PharmacyData[K]) => {
    const next = { ...values, [key]: value };
    setValues(next);
    onChange(next as Record<string, unknown>);
  };

  return (
    <Stack spacing={2}>
      <Typography variant="subtitle2" sx={{ fontWeight: 700, color: brand.primary[700] }}>
        Pharmacy Details
      </Typography>

      <FormControlLabel
        control={
          <Switch
            checked={!!values.rxRequired}
            onChange={(e) => patch('rxRequired', e.target.checked)}
          />
        }
        label="Prescription Required (Rx)"
      />

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
        <TextField
          label="Batch Number"
          size="small"
          fullWidth
          value={values.batchNumber ?? ''}
          onChange={(e) => patch('batchNumber', e.target.value || undefined)}
          error={!!errors.batchNumber}
          helperText={errors.batchNumber}
        />
        <TextField
          label="NDA / TFDA Registration *"
          size="small"
          fullWidth
          value={values.ndaRegistration ?? ''}
          onChange={(e) => patch('ndaRegistration', e.target.value || undefined)}
          error={!!errors.ndaRegistration}
          helperText={errors.ndaRegistration ?? 'Required for pharmaceutical products'}
        />
      </Stack>

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
        <TextField
          label="Manufacture Date"
          type="date"
          size="small"
          fullWidth
          value={values.manufactureDate ?? ''}
          onChange={(e) => patch('manufactureDate', e.target.value || undefined)}
          InputLabelProps={{ shrink: true }}
        />
        <TextField
          label="Expiry Date"
          type="date"
          size="small"
          fullWidth
          value={values.expiryDate ?? ''}
          onChange={(e) => patch('expiryDate', e.target.value || undefined)}
          InputLabelProps={{ shrink: true }}
          error={!!errors.expiryDate}
          helperText={errors.expiryDate}
        />
      </Stack>

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
        <TextField
          label="Storage Conditions"
          select
          size="small"
          fullWidth
          value={values.storageConditions ?? ''}
          onChange={(e) => patch('storageConditions', e.target.value || undefined)}
        >
          <MenuItem value="room_temp">Room Temperature</MenuItem>
          <MenuItem value="refrigerated">Refrigerated (2-8C)</MenuItem>
          <MenuItem value="frozen">Frozen</MenuItem>
        </TextField>
        <TextField
          label="Dosage Form"
          select
          size="small"
          fullWidth
          value={values.dosageForm ?? ''}
          onChange={(e) => patch('dosageForm', e.target.value || undefined)}
        >
          <MenuItem value="tablet">Tablet</MenuItem>
          <MenuItem value="capsule">Capsule</MenuItem>
          <MenuItem value="syrup">Syrup</MenuItem>
          <MenuItem value="injection">Injection</MenuItem>
          <MenuItem value="cream">Cream</MenuItem>
          <MenuItem value="ointment">Ointment</MenuItem>
          <MenuItem value="powder">Powder</MenuItem>
        </TextField>
      </Stack>

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
        <TextField
          label="Strength / Concentration"
          size="small"
          fullWidth
          value={values.strength ?? ''}
          onChange={(e) => patch('strength', e.target.value || undefined)}
          placeholder="e.g. 500mg, 5ml/100mg"
        />
        <TextField
          label="Generic Name"
          size="small"
          fullWidth
          value={values.genericName ?? ''}
          onChange={(e) => patch('genericName', e.target.value || undefined)}
        />
      </Stack>

      <TextField
        label="ATC Code"
        size="small"
        fullWidth
        value={values.atcCode ?? ''}
        onChange={(e) => patch('atcCode', e.target.value || undefined)}
        placeholder="e.g. N02BE01"
        error={!!errors.atcCode}
        helperText={errors.atcCode ?? 'Anatomical Therapeutic Chemical classification'}
      />
    </Stack>
  );
}
```

### 3.4 Hardware Extension Form Component

```typescript
// src/views/smartpos/products/verticals/HardwareExtensionForm.tsx
import { useState } from 'react';
import {
  Box, Stack, TextField, Typography,
} from '@mui/material';
import { brand } from 'src/theme/smartpos/brand';
import type { VerticalFormProps } from './registry';

interface HardwareData {
  warrantyMonths?: number;
  guaranteeMonths?: number;
  lengthCm?: number;
  widthCm?: number;
  heightCm?: number;
  weightGrams?: number;
  material?: string;
  countryOfOrigin?: string;
  powerWatts?: number;
  voltage?: string;
  specifications?: Record<string, string>;
}

export default function HardwareExtensionForm({ data, onChange, errors = {} }: VerticalFormProps) {
  const [values, setValues] = useState<HardwareData>(data as HardwareData);

  const patch = <K extends keyof HardwareData>(key: K, value: HardwareData[K]) => {
    const next = { ...values, [key]: value };
    setValues(next);
    onChange(next as Record<string, unknown>);
  };

  return (
    <Stack spacing={2}>
      <Typography variant="subtitle2" sx={{ fontWeight: 700, color: brand.info.dark }}>
        Hardware Details
      </Typography>

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
        <TextField
          label="Warranty (months)"
          type="number"
          size="small"
          fullWidth
          value={values.warrantyMonths ?? ''}
          onChange={(e) => patch('warrantyMonths', e.target.value ? Number(e.target.value) : undefined)}
        />
        <TextField
          label="Guarantee (months)"
          type="number"
          size="small"
          fullWidth
          value={values.guaranteeMonths ?? ''}
          onChange={(e) => patch('guaranteeMonths', e.target.value ? Number(e.target.value) : undefined)}
        />
      </Stack>

      <Typography variant="caption" sx={{ fontWeight: 700, color: brand.neutral[500], textTransform: 'uppercase' }}>
        Dimensions
      </Typography>
      <Stack direction="row" spacing={2}>
        <TextField
          label="Length"
          type="number"
          size="small"
          fullWidth
          value={values.lengthCm ?? ''}
          onChange={(e) => patch('lengthCm', e.target.value ? Number(e.target.value) : undefined)}
          placeholder="cm"
        />
        <TextField
          label="Width"
          type="number"
          size="small"
          fullWidth
          value={values.widthCm ?? ''}
          onChange={(e) => patch('widthCm', e.target.value ? Number(e.target.value) : undefined)}
          placeholder="cm"
        />
        <TextField
          label="Height"
          type="number"
          size="small"
          fullWidth
          value={values.heightCm ?? ''}
          onChange={(e) => patch('heightCm', e.target.value ? Number(e.target.value) : undefined)}
          placeholder="cm"
        />
      </Stack>

      <TextField
        label="Weight"
        type="number"
        size="small"
        fullWidth
        value={values.weightGrams ?? ''}
        onChange={(e) => patch('weightGrams', e.target.value ? Number(e.target.value) : undefined)}
        placeholder="grams"
      />

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
        <TextField
          label="Material"
          size="small"
          fullWidth
          value={values.material ?? ''}
          onChange={(e) => patch('material', e.target.value || undefined)}
          placeholder="e.g. Stainless steel, ABS plastic"
        />
        <TextField
          label="Country of Origin"
          size="small"
          fullWidth
          value={values.countryOfOrigin ?? ''}
          onChange={(e) => patch('countryOfOrigin', e.target.value || undefined)}
          placeholder="e.g. China, Japan, Germany"
        />
      </Stack>

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
        <TextField
          label="Power (Watts)"
          type="number"
          size="small"
          fullWidth
          value={values.powerWatts ?? ''}
          onChange={(e) => patch('powerWatts', e.target.value ? Number(e.target.value) : undefined)}
        />
        <TextField
          label="Voltage"
          size="small"
          fullWidth
          value={values.voltage ?? ''}
          onChange={(e) => patch('voltage', e.target.value || undefined)}
          placeholder="e.g. 220V, 110-240V"
          error={!!errors.voltage}
          helperText={errors.voltage}
        />
      </Stack>
    </Stack>
  );
}
```

### 3.5 Product Edit Drawer Integration

The `ProductEditDrawer` dynamically loads vertical extension sections.

```typescript
// Modifications to ProductEditDrawer.tsx

// 1. Import vertical context and form components
import { useVerticals } from 'src/context/smartpos/VerticalContext';
import PharmacyExtensionForm from './verticals/PharmacyExtensionForm';
import HardwareExtensionForm from './verticals/HardwareExtensionForm';

// 2. Lazy-load vertical form components
const verticalForms: Record<string, React.ComponentType<VerticalFormProps>> = {
  pharmacy: PharmacyExtensionForm,
  hardware: HardwareExtensionForm,
  // supermarket: () => import('./verticals/SupermarketExtensionForm'),
  // restaurant: () => import('./verticals/RestaurantExtensionForm'),
};

// 3. Add to ProductDrawerForm type
type ProductDrawerForm = Omit<CreateProductBody, 'code'> & {
  code: string;
  // Vertical extension data keyed by vertical key
  extensions: Record<string, Record<string, unknown>>;
};

const emptyForm: ProductDrawerForm = {
  code: '', name: '', description: '',
  cost: 0, price: 0,
  taxMethod: 'EXCLUSIVE',
  taxRate: 0,
  stockAlert: 0,
  type: 'STANDARD',
  status: true,
  sellable: true,
  featured: false,
  hideOnline: false,
  trackSerial: false,
  trackImei: false,
  barcodeSymbology: 'CODE128',
  points: 0,
  extensions: {},
};

// 4. In the component body
export default function ProductEditDrawer({ open, initial, onClose, onSaved, onDuplicate, prefill }: ProductEditDrawerProps) {
  const { activeVerticals, hasVertical } = useVerticals();
  // ... existing state ...
  const [extensionData, setExtensionData] = useState<Record<string, Record<string, unknown>>>({});

  // 5. Populate extensions when drawer opens
  useEffect(() => {
    const src = initial ?? prefill;
    if (src) {
      // ... existing form population ...
      setExtensionData(src.extensions ?? {});
    } else {
      // ... reset ...
      setExtensionData({});
    }
  }, [initial, prefill, open]);

  // 6. In the submit handler
  const handleSubmit = async () => {
    // ... validation ...

    const body: CreateProductBody = {
      ...form,
      code: form.code.trim() || undefined,
      variants: variants.length > 0 ? variants : undefined,
      extensions: extensionData,  // Send vertical extension data
    };

    try {
      const saved = initial
        ? await updateProduct(initial.id, body)
        : await createProduct(body);
      onSaved(saved);
      onClose();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSubmitting(false);
    }
  };

  // 7. Render vertical sections
  const renderVerticalSections = () => {
    if (activeVerticals.length === 0) return null;

    return activeVerticals.map((vertical) => {
      const FormComponent = verticalForms[vertical.key];
      if (!FormComponent) return null;

      return (
        <Accordion
          key={vertical.key}
          expanded={openSections[`vertical_${vertical.key}`] ?? false}
          onChange={() => toggle(`vertical_${vertical.key}`)}
          disableGutters elevation={0}
          sx={{
            border: `1px solid ${brand.neutral[200]}`,
            borderRadius: '14px !important',
            '&:before': { display: 'none' },
            mt: 1,
          }}
        >
          <AccordionSummary expandIcon={<IconChevronDown size={18} />} sx={{ px: 2, py: 0.5 }}>
            <SectionTitle
              icon={<IconPackage size={16} />}
              title={vertical.label}
              hint={`${vertical.label}-specific product attributes`}
            />
          </AccordionSummary>
          <AccordionDetails sx={{ pt: 0, px: 2, pb: 2 }}>
            <FormComponent
              data={extensionData[vertical.key] ?? {}}
              onChange={(data) => setExtensionData((prev) => ({ ...prev, [vertical.key]: data }))}
            />
          </AccordionDetails>
        </Accordion>
      );
    });
  };

  // 8. Insert vertical sections into the accordion stack
  // Place after "Warranty & tracking" and before "Visibility"
  // In the JSX:
  //   {renderVerticalSections()}

  // ... rest of component ...
}
```

### 3.6 Product List Page — Vertical Badges

```typescript
// In ProductsListPage.tsx — show vertical badges per product

import Chip from '@mui/material/Chip';
import { useVerticals } from 'src/context/smartpos/VerticalContext';

function ProductVerticalBadges({ product }: { product: Product }) {
  const { activeVerticals } = useVerticals();
  const extensions = product.extensions ?? {};

  return (
    <Stack direction="row" spacing={0.5}>
      {activeVerticals.map((v) => {
        if (!extensions[v.key]) return null;
        return (
          <Chip
            key={v.key}
            label={v.label}
            size="small"
            sx={{
              height: 20,
              fontSize: '0.6875rem',
              fontWeight: 600,
              bgcolor: getVerticalColor(v.key),
              color: '#fff',
            }}
          />
        );
      })}
    </Stack>
  );
}

function getVerticalColor(key: string): string {
  switch (key) {
    case 'pharmacy': return '#E91E63';
    case 'hardware': return '#2196F3';
    case 'supermarket': return '#4CAF50';
    case 'restaurant': return '#FF9800';
    default: return '#9E9E9E';
  }
}
```

---

## 4. API Contract Changes

### 4.1 New Endpoints

```
GET    /api/v1/tenants/me/verticals
       → 200 [{ key: "pharmacy", label: "Pharmacy", active: true }]

POST   /api/v1/tenants/me/verticals
       Body: { verticalKey: "pharmacy" }
       → 201 { tenantId, verticalKey, activatedAt }

DELETE /api/v1/tenants/me/verticals/{verticalKey}
       → 204

GET    /api/v1/verticals/{verticalKey}/fields
       → 200 [{ fieldKey, fieldType, label, required, validationRule, sortOrder }]
       Returns field definitions for dynamic UI generation.
```

### 4.2 Modified Endpoints

```
GET    /api/v1/products/{id}
       Response now includes:
         extensions: {
           "pharmacy": { rxRequired: true, batchNumber: "B12345", ... },
           "hardware": { warrantyMonths: 12, ... }
         }

POST   /api/v1/products
       Body now accepts:
         extensions: {
           "pharmacy": { rxRequired: true, ... },
           "hardware": { warrantyMonths: 12, ... }
         }
       Backend validates each extension against its vertical's rules.

PUT    /api/v1/products/{id}
       Same extension shape as POST.
       Extensions are upserted per vertical. Absent keys = no change.
       Null value for a vertical key = delete that extension.
```

### 4.3 Modified Types (Frontend)

```typescript
// src/api/smartpos/types.ts

export interface Product {
  // ... existing fields ...
  /** Vertical extension data keyed by vertical key */
  extensions?: Record<string, unknown>;
}

export interface CreateProductBody {
  // ... existing fields ...
  /** Vertical-specific extension data. Each key must match an active vertical. */
  extensions?: Record<string, unknown>;
}
```

---

## 5. Migration Strategy

### Phase 1: Schema & Backend (Week 1)

1. Run migration `V22__vertical_extensions.sql`
2. Create `VerticalExtension` interface, `VerticalRegistry`, `ProductVerticalExtension` entity
3. Implement `PharmacyVerticalExtension` and `HardwareVerticalExtension`
4. Modify `ProductService.create()` and `.update()` to delegate extensions
5. Modify `ProductDto` to carry `extensions` map
6. Keep legacy columns on `products` table for backward compatibility

### Phase 2: Data Migration (Week 2)

1. Backfill `product_vertical_extensions` from existing product columns:
   ```sql
   -- Migrate hardware fields
   INSERT INTO product_vertical_extensions (product_id, vertical_key, data)
   SELECT id, 'hardware', jsonb_build_object(
       'warrantyMonths', warranty_months,
       'guaranteeMonths', guarantee_months,
       'lengthCm', length_cm,
       'widthCm', width_cm,
       'heightCm', height_cm,
       'weightGrams', weight_grams
   )
   FROM products
   WHERE warranty_months IS NOT NULL
      OR guarantee_months IS NOT NULL
      OR length_cm IS NOT NULL
      OR width_cm IS NOT NULL
      OR height_cm IS NOT NULL
      OR weight_grams IS NOT NULL;
   ```

2. For tenants with pharmacy inventory patterns, run a heuristic to tag products:
   ```sql
   -- Tag products in pharmacy-related categories
   INSERT INTO product_vertical_extensions (product_id, vertical_key, data)
   SELECT p.id, 'pharmacy', '{}'::jsonb
   FROM products p
   JOIN categories c ON p.category_id = c.id
   WHERE lower(c.name) LIKE '%pharma%' OR lower(c.name) LIKE '%medicine%' OR lower(c.name) LIKE '%drug%';
   ```

### Phase 3: Frontend (Week 2-3)

1. Create `VerticalContext`, `VerticalProvider`
2. Create `PharmacyExtensionForm`, `HardwareExtensionForm`
3. Modify `ProductEditDrawer` to include dynamic vertical sections
4. Modify `ProductDto` type to include `extensions`
5. Add vertical badge rendering to product list

### Phase 4: Tenant Activation (Week 3)

1. Add vertical selection to onboarding (step after industry selection)
2. Add vertical management to settings page
3. Create feature assignments for vertical features:
   - `VERTICAL_PHARMACY` → assign to relevant plans
   - `VERTICAL_HARDWARE` → assign to relevant plans
   - etc.

### Phase 5: Cleanup (Week 4-6)

1. After all tenants have migrated, deprecate legacy columns:
   ```sql
   -- Mark columns as deprecated (soft removal)
   COMMENT ON COLUMN products.warranty_months IS 'DEPRECATED: moved to hardware vertical extension';
   -- etc.
   ```
2. In a future major version, remove the columns entirely.

### Rollback Plan

If issues arise:
- Phase 1-2: Drop new tables, no data loss (legacy columns intact)
- Phase 3: Revert frontend changes, API still accepts requests without extensions
- Phase 4: Deactivate vertical features, extensions stop rendering but data is preserved

---

## 6. Example: Pharmacy vs Hardware Extension

### 6.1 Pharmacy Product — Paracetamol 500mg Tablets

```json
{
  "id": "prod-001",
  "code": "MED-PAR-500",
  "name": "Paracetamol 500mg Tablets",
  "description": "Pain relief and fever reducer",
  "cost": 1500,
  "price": 2500,
  "type": "STANDARD",
  "categoryId": "cat-pharma",
  "extensions": {
    "pharmacy": {
      "rxRequired": false,
      "batchNumber": "B2024-Q3-001",
      "expiryDate": "2026-09-30",
      "manufactureDate": "2024-03-15",
      "storageConditions": "room_temp",
      "dosageForm": "tablet",
      "strength": "500mg",
      "genericName": "Paracetamol / Acetaminophen",
      "atcCode": "N02BE01",
      "ndaRegistration": "TFDA-2024-001234"
    }
  }
}
```

**Backend validation:**
- `ndaRegistration` is required (pharmacy rule)
- `expiryDate` > `manufactureDate` (pharmacy rule)
- `atcCode` matches pattern `[A-Z]\d{2}[A-Z]{2}\d{2}` (pharmacy rule)
- No `hardware` extension data means hardware validator is skipped

**Frontend rendering:**
- Vertical badge: "Pharmacy" (pink)
- Form section: Shows pharmacy fields (Rx toggle, batch number, expiry, dosage form, etc.)
- Hardware section: Hidden (tenant does not have hardware vertical active)

### 6.2 Hardware Product — Electric Drill

```json
{
  "id": "prod-002",
  "code": "TOOL-DRILL-001",
  "name": "Cordless Electric Drill 18V",
  "description": "Professional grade cordless drill",
  "cost": 85000,
  "price": 120000,
  "type": "STANDARD",
  "categoryId": "cat-tools",
  "extensions": {
    "hardware": {
      "warrantyMonths": 24,
      "guaranteeMonths": 6,
      "lengthCm": 28.5,
      "widthCm": 8.2,
      "heightCm": 22.0,
      "weightGrams": 1850,
      "material": "ABS plastic / Steel",
      "countryOfOrigin": "China",
      "powerWatts": 450,
      "voltage": "18V",
      "specifications": {
        "rpm": "0-1500",
        "torque": "45 Nm",
        "chuckSize": "10mm",
        "batteryType": "Li-ion 2.0Ah"
      }
    }
  }
}
```

**Backend validation:**
- All three dimensions provided together (hardware rule)
- Voltage matches `\d{2,3}V` pattern (hardware rule)
- No `pharmacy` extension data means pharmacy validator is skipped

**Frontend rendering:**
- Vertical badge: "Hardware" (blue)
- Form section: Shows hardware fields (warranty, dimensions, weight, material, power, specs)
- Pharmacy section: Hidden

### 6.3 Multi-Vertical Product — Supermarket with Pharmacy Counter

A tenant has both `supermarket` and `pharmacy` verticals active. A product can have BOTH extensions:

```json
{
  "id": "prod-003",
  "code": "MED-VIT-C",
  "name": "Vitamin C 1000mg Effervescent",
  "cost": 8000,
  "price": 15000,
  "categoryId": "cat-health",
  "extensions": {
    "pharmacy": {
      "rxRequired": false,
      "batchNumber": "VIT2024-B",
      "expiryDate": "2026-12-31",
      "dosageForm": "tablet",
      "strength": "1000mg",
      "genericName": "Ascorbic Acid",
      "ndaRegistration": "TFDA-2024-005678"
    },
    "supermarket": {
      "shelfLifeDays": 730,
      "allergenInfo": "Contains aspartame",
      "nutritionalInfo": {
        "vitaminC": "1000mg",
        "sodium": "277mg"
      },
      "organicCertified": false,
      "halalCertified": true
    }
  }
}
```

**Backend:** Both validators run. Each validates only its own extension data.

**Frontend:** Both pharmacy and supermarket form sections are rendered. Product shows both badges.

---

## 7. Adding a New Vertical (Zero Core Changes)

To add a "Restaurant" vertical:

### Step 1: Database
```sql
INSERT INTO vertical_definitions (key, label, description, feature_key, sort_order)
VALUES ('restaurant', 'Restaurant / Mlo', 'Food service with recipes', 'VERTICAL_RESTAURANT', 40);

INSERT INTO vertical_field_definitions (...) VALUES
    ('restaurant', 'prepTimeMinutes', 'number', ...),
    ('restaurant', 'recipeCost', 'number', ...),
    ...
```

### Step 2: Backend (new file only)
```java
// src/main/java/io/smartpos/product/domain/vertical/restaurant/RestaurantExtensionDto.java
public record RestaurantExtensionDto(...) {}

// src/main/java/io/smartpos/product/domain/vertical/restaurant/RestaurantVerticalExtension.java
@Component
public class RestaurantVerticalExtension implements VerticalExtension {
    @Override public String getKey() { return "restaurant"; }
    // ... implement interface methods
}
```

### Step 3: Frontend (new file only)
```typescript
// src/views/smartpos/products/verticals/RestaurantExtensionForm.tsx
export default function RestaurantExtensionForm({ data, onChange }: VerticalFormProps) { ... }
```

### Step 4: Register in ProductEditDrawer
```typescript
const verticalForms = {
  pharmacy: PharmacyExtensionForm,
  hardware: HardwareExtensionForm,
  restaurant: RestaurantExtensionForm,  // add this line
};
```

**No changes to:** Product entity, ProductService core logic, CreateProductRequest base fields, Product table schema.

---

## 8. Performance Considerations

| Concern | Mitigation |
|---------|------------|
| N+1 loading extensions | Extension data is loaded once per product, batched via `findByProductId` (IN clause for lists). |
| JSONB query performance | GIN index on `data` column. Vertical-specific searches use `data @> '{"rxRequired":true}'`. |
| Tenant vertical cache | `TenantVerticalService` caches active verticals in Redis with 5-minute TTL. |
| Frontend bundle size | Vertical form components are lazy-loaded via `React.lazy()` + dynamic imports. |
| Large extension payloads | Validate max size (~10KB per extension) in `VerticalExtensionService.saveAll()`. |

---

## 9. Security Considerations

- Extension data is validated server-side by the vertical's validator. Never trust client-provided JSON.
- The `extensions` map keys are validated against `tenant_verticals` — a tenant cannot set data for a vertical they don't have active.
- Sanitize string fields to prevent XSS in the frontend. Use React's built-in escaping (no `dangerouslySetInnerHTML`).
- Feature gate verticals at the tenant level via the existing `feature_assignments` system.
- Audit log extension changes separately or include in product audit trail.

---

## 10. Summary

| Aspect | Before | After |
|--------|--------|-------|
| Product entity | 196 lines, bloated with all fields | 150 lines, universal fields only |
| Adding pharmacy fields | Modify Product.java, DTOs, DB columns, frontend form | Create `PharmacyExtensionDto` + `PharmacyVerticalExtension` + form component |
| Multi-tenant vertical support | Not possible | Tenant activates any subset of verticals |
| Multi-vertical products | Not possible | Product carries extensions for multiple verticals |
| Frontend form size | Monolithic ~1500-line drawer | Core drawer + per-vertical lazy-loaded sections |
| Validation | Inline in service | Per-vertical validator chain, conditionally invoked |
| Database columns | Growing with each vertical | Stable core + JSONB extensions |
