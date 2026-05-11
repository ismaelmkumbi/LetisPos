# Operate & Purchases — Missing Features Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement 4 missing features (Suspended Sales, Goods Received, Supplier Returns, Supplier Payments) to complete the Operate and Purchases menu sections.

**Architecture:** Suspended Sales gets a new entity+controller in sales-service. Goods Received and Supplier Returns extend existing Purchase/PurchaseReturn controllers. Supplier Payments adds a read-only projection controller in payment-service. All 4 get dedicated frontend pages following the existing DataTable/PageHeader/FilterBar pattern.

**Tech Stack:** Java 21, Spring Boot 3, JPA/Hibernate, PostgreSQL, Redis (caching), React 19, TypeScript, MUI 6, React Router 7

---

## Phase 1: Suspended Sales — Backend

### Task 1.1: Create SuspendedSale entity

**Files:**
- Create: `backend/sales-service/src/main/java/io/smartpos/sales/domain/model/SuspendedSale.java`
- Create: `backend/sales-service/src/main/java/io/smartpos/sales/domain/model/SuspendedSaleStatus.java`

- [ ] **Step 1: Create SuspendedSaleStatus enum**

```java
package io.smartpos.sales.domain.model;

public enum SuspendedSaleStatus {
    OPEN,
    RESUMED,
    EXPIRED
}
```

- [ ] **Step 2: Create SuspendedSale entity**

```java
package io.smartpos.sales.domain.model;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "suspended_sales")
@Getter @Setter
@NoArgsConstructor @AllArgsConstructor
@Builder
public class SuspendedSale {

    @Id
    @Column(name = "id", nullable = false, updatable = false)
    private UUID id;

    @Column(name = "ref", nullable = false)
    private String ref;

    @Column(name = "tenant_id", nullable = false)
    private UUID tenantId;

    @Column(name = "terminal_id")
    private UUID terminalId;

    @Column(name = "user_id")
    private UUID userId;

    @Column(name = "customer_id")
    private UUID customerId;

    @Column(name = "warehouse_id")
    private UUID warehouseId;

    @Column(name = "lines", columnDefinition = "jsonb")
    private String lines;

    @Enumerated(EnumType.STRING)
    @Column(name = "discount_type")
    private DiscountType discountType;

    @Column(name = "discount_value")
    private BigDecimal discountValue;

    @Enumerated(EnumType.STRING)
    @Column(name = "tax_method")
    private TaxMethod taxMethod;

    @Column(name = "notes")
    private String notes;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false)
    @Builder.Default
    private SuspendedSaleStatus status = SuspendedSaleStatus.OPEN;

    @Column(name = "grand_total")
    private BigDecimal grandTotal;

    @Column(name = "total_items")
    private Integer totalItems;

    @Column(name = "expires_at")
    private Instant expiresAt;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @PrePersist
    void onCreate() {
        if (id == null) id = UUID.randomUUID();
        Instant now = Instant.now();
        if (createdAt == null) createdAt = now;
        if (expiresAt == null) expiresAt = now.plus(java.time.Duration.ofDays(7));
        updatedAt = now;
    }

    @PreUpdate
    void onUpdate() { updatedAt = Instant.now(); }

    public boolean isExpired() { return Instant.now().isAfter(expiresAt); }
}
```

- [ ] **Step 3: Create Liquibase migration**

Create: `backend/sales-service/src/main/resources/db/changelog/changes/0011-suspended-sales.xml`

```xml
<?xml version="1.0" encoding="UTF-8"?>
<databaseChangeLog
    xmlns="http://www.liquibase.org/xml/ns/dbchangelog"
    xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
    xsi:schemaLocation="http://www.liquibase.org/xml/ns/dbchangelog
        http://www.liquibase.org/xml/ns/dbchangelog/dbchangelog-4.20.xsd">

    <changeSet id="0011-create-suspended-sales" author="system">
        <createTable tableName="suspended_sales">
            <column name="id" type="UUID"><constraints primaryKey="true" nullable="false"/></column>
            <column name="ref" type="VARCHAR(50)"><constraints nullable="false"/></column>
            <column name="tenant_id" type="UUID"><constraints nullable="false"/></column>
            <column name="terminal_id" type="UUID"/>
            <column name="user_id" type="UUID"/>
            <column name="customer_id" type="UUID"/>
            <column name="warehouse_id" type="UUID"/>
            <column name="lines" type="JSONB"/>
            <column name="discount_type" type="VARCHAR(20)"/>
            <column name="discount_value" type="DECIMAL(15,2)"/>
            <column name="tax_method" type="VARCHAR(20)"/>
            <column name="notes" type="VARCHAR(500)"/>
            <column name="status" type="VARCHAR(20)"><constraints nullable="false"/></column>
            <column name="grand_total" type="DECIMAL(15,2)"/>
            <column name="total_items" type="INT"/>
            <column name="expires_at" type="TIMESTAMP WITH TIME ZONE"/>
            <column name="created_at" type="TIMESTAMP WITH TIME ZONE"><constraints nullable="false"/></column>
            <column name="updated_at" type="TIMESTAMP WITH TIME ZONE"><constraints nullable="false"/></column>
        </createTable>
        <createIndex tableName="suspended_sales" indexName="idx_suspended_sales_tenant">
            <column name="tenant_id"/>
        </createIndex>
        <createIndex tableName="suspended_sales" indexName="idx_suspended_sales_status">
            <column name="status"/>
        </createIndex>
    </changeSet>
</databaseChangeLog>
```

Then include in the master changelog if it exists, or reference in application.yml.

- [ ] **Step 4: Commit**

```bash
git add backend/sales-service/src/main/java/io/smartpos/sales/domain/model/SuspendedSaleStatus.java \
        backend/sales-service/src/main/java/io/smartpos/sales/domain/model/SuspendedSale.java \
        backend/sales-service/src/main/resources/db/changelog/changes/0011-suspended-sales.xml
git commit -m "feat(sales): add SuspendedSale entity and migration"
```

---

### Task 1.2: Create SuspendedSaleRepository

**Files:**
- Create: `backend/sales-service/src/main/java/io/smartpos/sales/domain/repository/SuspendedSaleRepository.java`

- [ ] **Step 1: Create repository**

```java
package io.smartpos.sales.domain.repository;

import io.smartpos.sales.domain.model.SuspendedSale;
import io.smartpos.sales.domain.model.SuspendedSaleStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.UUID;

public interface SuspendedSaleRepository extends JpaRepository<SuspendedSale, UUID> {

    @Query("""
        SELECT s FROM SuspendedSale s
        WHERE s.tenantId = :tenantId
          AND (:status IS NULL OR s.status = :status)
          AND (:search IS NULL OR LOWER(s.ref) LIKE LOWER(CONCAT('%', :search, '%')))
        ORDER BY s.createdAt DESC
        """)
    Page<SuspendedSale> search(@Param("tenantId") UUID tenantId,
                               @Param("status") SuspendedSaleStatus status,
                               @Param("search") String search,
                               Pageable pageable);

    @Modifying
    @Query("UPDATE SuspendedSale s SET s.status = 'EXPIRED' WHERE s.status = 'OPEN' AND s.expiresAt < :now")
    int expireOldHolds(@Param("now") Instant now);
}
```

- [ ] **Step 2: Commit**

```bash
git add backend/sales-service/src/main/java/io/smartpos/sales/domain/repository/SuspendedSaleRepository.java
git commit -m "feat(sales): add SuspendedSaleRepository"
```

---

### Task 1.3: Create SuspendedSaleDto and service

**Files:**
- Create: `backend/sales-service/src/main/java/io/smartpos/sales/api/dto/SuspendedSaleDto.java`
- Create: `backend/sales-service/src/main/java/io/smartpos/sales/application/SuspendedSaleService.java`

- [ ] **Step 1: Create DTO**

```java
package io.smartpos.sales.api.dto;

import io.smartpos.sales.domain.model.SuspendedSale;
import io.smartpos.sales.domain.model.SuspendedSaleStatus;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

public record SuspendedSaleDto(
    UUID id,
    String ref,
    UUID tenantId,
    UUID terminalId,
    UUID userId,
    UUID customerId,
    UUID warehouseId,
    String lines,
    String discountType,
    BigDecimal discountValue,
    String taxMethod,
    String notes,
    SuspendedSaleStatus status,
    BigDecimal grandTotal,
    Integer totalItems,
    Instant expiresAt,
    Instant createdAt
) {
    public static SuspendedSaleDto from(SuspendedSale s) {
        return new SuspendedSaleDto(
            s.getId(), s.getRef(), s.getTenantId(), s.getTerminalId(),
            s.getUserId(), s.getCustomerId(), s.getWarehouseId(),
            s.getLines(),
            s.getDiscountType() != null ? s.getDiscountType().name() : null,
            s.getDiscountValue(),
            s.getTaxMethod() != null ? s.getTaxMethod().name() : null,
            s.getNotes(), s.getStatus(), s.getGrandTotal(),
            s.getTotalItems(), s.getExpiresAt(), s.getCreatedAt()
        );
    }

    public record CreateRequest(
        @NotNull UUID tenantId,
        UUID terminalId,
        UUID customerId,
        @NotNull UUID warehouseId,
        @NotBlank String lines,
        String discountType,
        BigDecimal discountValue,
        String taxMethod,
        String notes,
        @NotNull BigDecimal grandTotal,
        @NotNull Integer totalItems
    ) {}
}
```

- [ ] **Step 2: Create service**

```java
package io.smartpos.sales.application;

import io.smartpos.sales.api.dto.SuspendedSaleDto;
import io.smartpos.sales.domain.model.DiscountType;
import io.smartpos.sales.domain.model.SuspendedSale;
import io.smartpos.sales.domain.model.SuspendedSaleStatus;
import io.smartpos.sales.domain.model.TaxMethod;
import io.smartpos.sales.domain.repository.SuspendedSaleRepository;
import io.smartpos.common.context.TenantContext;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.UUID;

@Service
@RequiredArgsConstructor
public class SuspendedSaleService {

    private final SuspendedSaleRepository repo;

    @Transactional(readOnly = true)
    public Page<SuspendedSaleDto> search(String search, SuspendedSaleStatus status, Pageable pageable) {
        return repo.search(TenantContext.require(), status, search, pageable)
                .map(SuspendedSaleDto::from);
    }

    @Transactional(readOnly = true)
    public SuspendedSaleDto get(UUID id) {
        return repo.findById(id)
                .map(SuspendedSaleDto::from)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Suspended sale not found"));
    }

    @Transactional
    public SuspendedSaleDto create(SuspendedSaleDto.CreateRequest req, UUID userId) {
        // Auto-expire old holds first
        repo.expireOldHolds(java.time.Instant.now());

        SuspendedSale s = SuspendedSale.builder()
                .ref(nextRef())
                .tenantId(req.tenantId())
                .terminalId(req.terminalId())
                .userId(userId)
                .customerId(req.customerId())
                .warehouseId(req.warehouseId())
                .lines(req.lines())
                .discountType(req.discountType() != null ? DiscountType.valueOf(req.discountType()) : null)
                .discountValue(req.discountValue())
                .taxMethod(req.taxMethod() != null ? TaxMethod.valueOf(req.taxMethod()) : null)
                .notes(req.notes())
                .grandTotal(req.grandTotal())
                .totalItems(req.totalItems())
                .build();
        return SuspendedSaleDto.from(repo.save(s));
    }

    @Transactional
    public SuspendedSaleDto resume(UUID id) {
        SuspendedSale s = repo.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Suspended sale not found"));
        if (s.isExpired() || s.getStatus() == SuspendedSaleStatus.EXPIRED) {
            throw new ResponseStatusException(HttpStatus.GONE, "This hold has expired");
        }
        if (s.getStatus() == SuspendedSaleStatus.RESUMED) {
            return SuspendedSaleDto.from(s); // idempotent
        }
        s.setStatus(SuspendedSaleStatus.RESUMED);
        return SuspendedSaleDto.from(repo.save(s));
    }

    @Transactional
    public void delete(UUID id) {
        if (!repo.existsById(id)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Suspended sale not found");
        }
        repo.deleteById(id);
    }

    @Transactional
    public int purgeExpired() {
        return repo.expireOldHolds(java.time.Instant.now());
    }

    private String nextRef() {
        long count = repo.count();
        return String.format("HOLD-%06d", count + 1);
    }
}
```

- [ ] **Step 3: Commit**

```bash
git add backend/sales-service/src/main/java/io/smartpos/sales/api/dto/SuspendedSaleDto.java \
        backend/sales-service/src/main/java/io/smartpos/sales/application/SuspendedSaleService.java
git commit -m "feat(sales): add SuspendedSaleDto and service"
```

---

### Task 1.4: Create SuspendedSaleController

**Files:**
- Create: `backend/sales-service/src/main/java/io/smartpos/sales/api/SuspendedSaleController.java`

- [ ] **Step 1: Create controller**

```java
package io.smartpos.sales.api;

import io.smartpos.sales.api.dto.SuspendedSaleDto;
import io.smartpos.sales.application.SuspendedSaleService;
import io.smartpos.sales.domain.model.SuspendedSaleStatus;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/suspended-sales")
@RequiredArgsConstructor
public class SuspendedSaleController {

    private final SuspendedSaleService service;

    @GetMapping
    @PreAuthorize("hasAuthority('sale.view')")
    public Page<SuspendedSaleDto> search(@RequestParam(required = false) String search,
                                          @RequestParam(required = false) SuspendedSaleStatus status,
                                          Pageable pageable) {
        return service.search(search, status, pageable);
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAuthority('sale.view')")
    public SuspendedSaleDto get(@PathVariable UUID id) {
        return service.get(id);
    }

    @PostMapping
    @PreAuthorize("hasAuthority('pos.checkout')")
    public ResponseEntity<SuspendedSaleDto> create(@Valid @RequestBody SuspendedSaleDto.CreateRequest req,
                                                    @AuthenticationPrincipal Jwt jwt) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(service.create(req, userIdFrom(jwt)));
    }

    @PostMapping("/{id}/resume")
    @PreAuthorize("hasAuthority('pos.checkout')")
    public SuspendedSaleDto resume(@PathVariable UUID id) {
        return service.resume(id);
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('sale.delete')")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable UUID id) { service.delete(id); }

    @DeleteMapping("/expired")
    @PreAuthorize("hasAuthority('sale.delete')")
    public ResponseEntity<String> purgeExpired() {
        int count = service.purgeExpired();
        return ResponseEntity.ok("Purged " + count + " expired holds");
    }

    private static UUID userIdFrom(Jwt jwt) {
        return jwt == null ? null : UUID.fromString(jwt.getSubject());
    }
}
```

- [ ] **Step 2: Commit**

```bash
git add backend/sales-service/src/main/java/io/smartpos/sales/api/SuspendedSaleController.java
git commit -m "feat(sales): add SuspendedSaleController"
```

---

## Phase 2: Goods Received — Backend

### Task 2.1: Add receivedQty/receivedAt to PurchaseLine

**Files:**
- Modify: `backend/sales-service/src/main/java/io/smartpos/sales/domain/model/PurchaseLine.java`

- [ ] **Step 1: Add fields**

Add to `PurchaseLine.java` after the `lineTotal` field:

```java
    @Column(name = "received_qty", nullable = false)
    @Builder.Default
    private BigDecimal receivedQty = BigDecimal.ZERO;

    @Column(name = "received_at")
    private Instant receivedAt;
```

- [ ] **Step 2: Create Liquibase migration**

Create: `backend/sales-service/src/main/resources/db/changelog/changes/0012-purchase-line-received.xml`

```xml
<?xml version="1.0" encoding="UTF-8"?>
<databaseChangeLog
    xmlns="http://www.liquibase.org/xml/ns/dbchangelog"
    xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
    xsi:schemaLocation="http://www.liquibase.org/xml/ns/dbchangelog
        http://www.liquibase.org/xml/ns/dbchangelog/dbchangelog-4.20.xsd">

    <changeSet id="0012-add-received-qty-to-purchase-lines" author="system">
        <addColumn tableName="purchase_lines">
            <column name="received_qty" type="DECIMAL(15,2)" defaultValueNumeric="0">
                <constraints nullable="false"/>
            </column>
            <column name="received_at" type="TIMESTAMP WITH TIME ZONE"/>
        </addColumn>
    </changeSet>
</databaseChangeLog>
```

- [ ] **Step 3: Commit**

```bash
git add backend/sales-service/src/main/java/io/smartpos/sales/domain/model/PurchaseLine.java \
        backend/sales-service/src/main/resources/db/changelog/changes/0012-purchase-line-received.xml
git commit -m "feat(sales): add receivedQty/receivedAt to PurchaseLine"
```

---

### Task 2.2: Add receiving endpoints to PurchaseController and PurchaseService

**Files:**
- Modify: `backend/sales-service/src/main/java/io/smartpos/sales/api/PurchaseController.java`
- Modify: `backend/sales-service/src/main/java/io/smartpos/sales/application/PurchaseService.java`
- Create: `backend/sales-service/src/main/java/io/smartpos/sales/api/dto/GoodsReceivedDto.java`

- [ ] **Step 1: Create GoodsReceivedDto (projection DTO for receiving list)**

```java
package io.smartpos.sales.api.dto;

import io.smartpos.sales.domain.model.Purchase;
import io.smartpos.sales.domain.model.PurchaseLine;
import io.smartpos.sales.domain.model.PurchaseStatus;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

public record GoodsReceivedDto(
    UUID id,
    String ref,
    LocalDate date,
    UUID supplierId,
    UUID warehouseId,
    PurchaseStatus status,
    BigDecimal grandTotal,
    BigDecimal totalOrderedQty,
    BigDecimal totalReceivedQty,
    List<ReceivedLine> lines,
    Instant receivedAt
) {
    public record ReceivedLine(
        UUID id,
        UUID productId,
        String productName,
        String productCode,
        BigDecimal orderedQty,
        BigDecimal receivedQty,
        BigDecimal remainingQty
    ) {
        public static ReceivedLine from(PurchaseLine l) {
            return new ReceivedLine(
                l.getId(), l.getProductId(),
                l.getProductNameSnapshot(), l.getProductCodeSnapshot(),
                l.getQty(), l.getReceivedQty(),
                l.getQty().subtract(l.getReceivedQty())
            );
        }
    }

    public static GoodsReceivedDto from(Purchase p) {
        BigDecimal totalOrdered = p.getLines().stream()
                .map(PurchaseLine::getQty).reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal totalReceived = p.getLines().stream()
                .map(PurchaseLine::getReceivedQty).reduce(BigDecimal.ZERO, BigDecimal::add);
        return new GoodsReceivedDto(
            p.getId(), p.getRef(), p.getDate(), p.getSupplierId(),
            p.getWarehouseId(), p.getStatus(), p.getGrandTotal(),
            totalOrdered, totalReceived,
            p.getLines().stream().map(ReceivedLine::from).collect(Collectors.toList()),
            p.getReceivedAt()
        );
    }
}
```

- [ ] **Step 2: Add receiving endpoints to PurchaseController**

Add these methods to `PurchaseController.java`:

```java
    @GetMapping("/receiving")
    @PreAuthorize("hasAuthority('purchase.view')")
    public Page<GoodsReceivedDto> listReceived(@RequestParam(required = false) UUID supplierId,
                                                @RequestParam(required = false) LocalDate dateFrom,
                                                @RequestParam(required = false) LocalDate dateTo,
                                                Pageable pageable) {
        return service.listReceived(supplierId, dateFrom, dateTo, pageable);
    }

    public record ReceiveLineRequest(@NotNull UUID lineId, @NotNull BigDecimal receivedQty) {}

    @PostMapping("/{id}/receive-line")
    @PreAuthorize("hasAuthority('purchase.update')")
    public GoodsReceivedDto receiveLine(@PathVariable UUID id,
                                         @Valid @RequestBody ReceiveLineRequest req) {
        return service.receiveLine(id, req.lineId(), req.receivedQty());
    }
```

- [ ] **Step 3: Add service methods to PurchaseService**

Add these methods to `PurchaseService.java`:

```java
    @Transactional(readOnly = true)
    public Page<io.smartpos.sales.api.dto.GoodsReceivedDto> listReceived(
            UUID supplierId, LocalDate dateFrom, LocalDate dateTo, Pageable pageable) {
        return purchaseRepo.findReceived(TenantContext.require(), supplierId, dateFrom, dateTo, pageable)
                .map(io.smartpos.sales.api.dto.GoodsReceivedDto::from);
    }

    @Transactional
    public io.smartpos.sales.api.dto.GoodsReceivedDto receiveLine(UUID purchaseId, UUID lineId, BigDecimal receivedQty) {
        Purchase p = purchaseRepo.findByIdWithLines(purchaseId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Purchase not found"));
        if (p.getStatus() == PurchaseStatus.CANCELLED) {
            throw new ResponseStatusException(HttpStatus.UNPROCESSABLE_ENTITY, "Cannot receive against a cancelled purchase");
        }
        PurchaseLine line = p.getLines().stream()
                .filter(l -> l.getId().equals(lineId))
                .findFirst()
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Line not found"));
        BigDecimal remaining = line.getQty().subtract(line.getReceivedQty());
        if (receivedQty.compareTo(remaining) > 0) {
            throw new ResponseStatusException(HttpStatus.UNPROCESSABLE_ENTITY,
                    "Cannot receive more than ordered. Remaining: " + remaining);
        }
        if (receivedQty.signum() <= 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Received quantity must be positive");
        }
        line.setReceivedQty(line.getReceivedQty().add(receivedQty));
        line.setReceivedAt(Instant.now());
        // Auto-transition to RECEIVED when all lines fully received
        boolean allReceived = p.getLines().stream()
                .allMatch(l -> l.getReceivedQty().compareTo(l.getQty()) >= 0);
        if (allReceived) {
            p.receive();
        }
        return io.smartpos.sales.api.dto.GoodsReceivedDto.from(purchaseRepo.save(p));
    }
```

- [ ] **Step 4: Add findReceived query to PurchaseRepository**

Add to `PurchaseRepository.java`:

```java
    @Query("""
        SELECT DISTINCT p FROM Purchase p JOIN FETCH p.lines
        WHERE p.tenantId = :tenantId
          AND p.status IN ('ORDERED', 'RECEIVED')
          AND (:supplierId IS NULL OR p.supplierId = :supplierId)
          AND (:dateFrom IS NULL OR p.date >= :dateFrom)
          AND (:dateTo IS NULL OR p.date <= :dateTo)
        ORDER BY p.date DESC
        """)
    Page<Purchase> findReceived(@Param("tenantId") UUID tenantId,
                                @Param("supplierId") UUID supplierId,
                                @Param("dateFrom") LocalDate dateFrom,
                                @Param("dateTo") LocalDate dateTo,
                                Pageable pageable);
```

- [ ] **Step 5: Commit**

```bash
git add backend/sales-service/src/main/java/io/smartpos/sales/api/dto/GoodsReceivedDto.java \
        backend/sales-service/src/main/java/io/smartpos/sales/api/PurchaseController.java \
        backend/sales-service/src/main/java/io/smartpos/sales/application/PurchaseService.java \
        backend/sales-service/src/main/java/io/smartpos/sales/domain/repository/PurchaseRepository.java
git commit -m "feat(sales): add goods received endpoints and partial receiving"
```

---

## Phase 3: Supplier Returns — Backend

### Task 3.1: Add list/complete endpoints to PurchaseReturnController and Service

**Files:**
- Modify: `backend/sales-service/src/main/java/io/smartpos/sales/api/PurchaseReturnController.java`
- Modify: `backend/sales-service/src/main/java/io/smartpos/sales/application/PurchaseReturnService.java`
- Modify: `backend/sales-service/src/main/java/io/smartpos/sales/domain/repository/PurchaseReturnRepository.java`

- [ ] **Step 1: Add list/search and complete to PurchaseReturnController**

Replace the existing file content:

```java
package io.smartpos.sales.api;

import io.smartpos.sales.api.dto.PurchaseReturnDto;
import io.smartpos.sales.application.PurchaseReturnService;
import io.smartpos.sales.domain.model.ReturnStatus;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.UUID;

@RestController
@RequiredArgsConstructor
public class PurchaseReturnController {

    private final PurchaseReturnService service;

    // -- Global list/search --
    @GetMapping("/api/v1/purchase-returns")
    @PreAuthorize("hasAuthority('purchase.view')")
    public Page<PurchaseReturnDto> search(@RequestParam(required = false) String search,
                                           @RequestParam(required = false) ReturnStatus status,
                                           @RequestParam(required = false) UUID supplierId,
                                           @RequestParam(required = false) LocalDate dateFrom,
                                           @RequestParam(required = false) LocalDate dateTo,
                                           Pageable pageable) {
        return service.search(search, status, supplierId, dateFrom, dateTo, pageable);
    }

    // -- Per-purchase create / list --
    @PostMapping("/api/v1/purchases/{purchaseId}/returns")
    @PreAuthorize("hasAuthority('purchase.return') or hasAuthority('purchase.update')")
    public ResponseEntity<PurchaseReturnDto> create(
            @PathVariable UUID purchaseId,
            @Valid @RequestBody PurchaseReturnDto.CreateRequest req,
            @AuthenticationPrincipal Jwt jwt) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(service.create(purchaseId, req, userIdFrom(jwt)));
    }

    @GetMapping("/api/v1/purchases/{purchaseId}/returns")
    @PreAuthorize("hasAuthority('purchase.view')")
    public Page<PurchaseReturnDto> listForPurchase(@PathVariable UUID purchaseId, Pageable pageable) {
        return service.listForPurchase(purchaseId, pageable);
    }

    // -- Single return --
    @GetMapping("/api/v1/purchase-returns/{id}")
    @PreAuthorize("hasAuthority('purchase.view')")
    public PurchaseReturnDto get(@PathVariable UUID id) { return service.get(id); }

    // -- Complete --
    @PostMapping("/api/v1/purchase-returns/{id}/complete")
    @PreAuthorize("hasAuthority('purchase.update')")
    public PurchaseReturnDto complete(@PathVariable UUID id) {
        return service.complete(id);
    }

    private static UUID userIdFrom(Jwt jwt) { return jwt == null ? null : UUID.fromString(jwt.getSubject()); }
}
```

- [ ] **Step 2: Add search/complete methods to PurchaseReturnService**

Add to `PurchaseReturnService.java`:

```java
    @Transactional(readOnly = true)
    public Page<PurchaseReturnDto> search(String search, ReturnStatus status, UUID supplierId,
                                           LocalDate dateFrom, LocalDate dateTo, Pageable pageable) {
        return repo.search(TenantContext.require(), search, status, supplierId, dateFrom, dateTo, pageable)
                .map(PurchaseReturnDto::from);
    }

    @Transactional
    public PurchaseReturnDto complete(UUID id) {
        PurchaseReturn r = repo.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Return not found"));
        if (r.getStatus() == ReturnStatus.CONFIRMED) return PurchaseReturnDto.from(r);
        if (r.getStatus() != ReturnStatus.DRAFT) {
            throw new ResponseStatusException(HttpStatus.UNPROCESSABLE_ENTITY, "Cannot complete a " + r.getStatus() + " return");
        }
        r.setStatus(ReturnStatus.CONFIRMED);
        return PurchaseReturnDto.from(repo.save(r));
    }
```

- [ ] **Step 3: Add search query to PurchaseReturnRepository**

Add to `PurchaseReturnRepository.java`:

```java
    @Query("""
        SELECT r FROM PurchaseReturn r
        WHERE r.tenantId = :tenantId
          AND (:search IS NULL OR LOWER(r.ref) LIKE LOWER(CONCAT('%', :search, '%')))
          AND (:status IS NULL OR r.status = :status)
          AND (:supplierId IS NULL OR r.supplierId = :supplierId)
          AND (:dateFrom IS NULL OR r.date >= :dateFrom)
          AND (:dateTo IS NULL OR r.date <= :dateTo)
        ORDER BY r.date DESC
        """)
    Page<PurchaseReturn> search(@Param("tenantId") UUID tenantId,
                                @Param("search") String search,
                                @Param("status") ReturnStatus status,
                                @Param("supplierId") UUID supplierId,
                                @Param("dateFrom") LocalDate dateFrom,
                                @Param("dateTo") LocalDate dateTo,
                                Pageable pageable);
```

Add the missing imports to the service file as needed.

- [ ] **Step 4: Commit**

```bash
git add backend/sales-service/src/main/java/io/smartpos/sales/api/PurchaseReturnController.java \
        backend/sales-service/src/main/java/io/smartpos/sales/application/PurchaseReturnService.java \
        backend/sales-service/src/main/java/io/smartpos/sales/domain/repository/PurchaseReturnRepository.java
git commit -m "feat(sales): add list/search and complete endpoints for supplier returns"
```

---

## Phase 4: Supplier Payments — Backend

### Task 4.1: Create SupplierPaymentController and Service

**Files:**
- Create: `backend/payment-service/src/main/java/io/smartpos/payment/api/dto/SupplierPaymentDto.java`
- Create: `backend/payment-service/src/main/java/io/smartpos/payment/api/SupplierPaymentController.java`
- Modify: `backend/payment-service/src/main/java/io/smartpos/payment/application/PaymentService.java`
- Modify: `backend/payment-service/src/main/java/io/smartpos/payment/domain/repository/PaymentRepository.java`

- [ ] **Step 1: Create SupplierPaymentDto**

```java
package io.smartpos.payment.api.dto;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

public record SupplierPaymentDto(
    UUID paymentId,
    UUID supplierId,
    String supplierName,
    UUID purchaseId,
    String purchaseRef,
    BigDecimal amount,
    String method,
    String reference,
    LocalDate date,
    UUID accountId,
    String accountName
) {}

/**
 * Supplier ledger: total purchases (debits), total payments (credits), and outstanding balance.
 */
public record SupplierLedgerDto(
    UUID supplierId,
    String supplierName,
    BigDecimal totalPurchases,
    BigDecimal totalPayments,
    BigDecimal outstandingBalance,
    java.util.List<SupplierPaymentDto> recentPayments
) {}
```

- [ ] **Step 2: Add repository query for supplier payments**

Add to `PaymentRepository.java`:

```java
    @Query(value = """
        SELECT p.id as paymentId, p.ref as ref,
               p.reference_id as purchaseId, pur.ref as purchaseRef,
               pur.supplier_id as supplierId, s.name as supplierName,
               p.amount as amount, p.method as method,
               p.external_ref as reference, p.date as date,
               p.account_id as accountId, a.name as accountName
        FROM payments p
        JOIN purchases pur ON p.reference_id = pur.id
        JOIN suppliers s ON pur.supplier_id = s.id
        JOIN accounts a ON p.account_id = a.id
        WHERE p.reference_type = 'PURCHASE'
          AND p.tenant_id = :tenantId
          AND (:supplierId IS NULL OR pur.supplier_id = :supplierId)
          AND (:method IS NULL OR p.method = :method)
          AND (:dateFrom IS NULL OR p.date >= :dateFrom)
          AND (:dateTo IS NULL OR p.date <= :dateTo)
          AND (:search IS NULL OR LOWER(s.name) LIKE LOWER(CONCAT('%', :search, '%'))
                             OR LOWER(pur.ref) LIKE LOWER(CONCAT('%', :search, '%')))
        ORDER BY p.date DESC
        """, nativeQuery = true)
    Page<Object[]> findSupplierPaymentsRaw(@Param("tenantId") UUID tenantId,
                                            @Param("supplierId") UUID supplierId,
                                            @Param("method") String method,
                                            @Param("dateFrom") LocalDate dateFrom,
                                            @Param("dateTo") LocalDate dateTo,
                                            @Param("search") String search,
                                            Pageable pageable);
```

- [ ] **Step 3: Add service method**

Add to `PaymentService.java`:

```java
    private final PaymentRepository paymentRepo;

    @Transactional(readOnly = true)
    public Page<SupplierPaymentDto> searchSupplierPayments(
            UUID supplierId, String method, LocalDate dateFrom, LocalDate dateTo,
            String search, Pageable pageable) {
        return paymentRepo.findSupplierPaymentsRaw(
                TenantContext.require(), supplierId, method, dateFrom, dateTo, search, pageable)
                .map(row -> new SupplierPaymentDto(
                    (UUID) row[0],           // paymentId
                    (UUID) row[2],           // supplierId
                    (String) row[3],         // supplierName
                    (UUID) row[1],           // purchaseId
                    (String) row[4],         // purchaseRef
                    (BigDecimal) row[5],     // amount
                    (String) row[6],         // method
                    (String) row[7],         // reference
                    ((java.sql.Date) row[8]).toLocalDate(), // date
                    (UUID) row[9],           // accountId
                    (String) row[10]         // accountName
                ));
    }
```

- [ ] **Step 4: Create SupplierPaymentController**

```java
package io.smartpos.payment.api;

import io.smartpos.payment.api.dto.SupplierPaymentDto;
import io.smartpos.payment.application.PaymentService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/payments/supplier")
@RequiredArgsConstructor
public class SupplierPaymentController {

    private final PaymentService service;

    @GetMapping
    @PreAuthorize("hasAuthority('payment.view')")
    public Page<SupplierPaymentDto> list(@RequestParam(required = false) UUID supplierId,
                                          @RequestParam(required = false) String method,
                                          @RequestParam(required = false) LocalDate dateFrom,
                                          @RequestParam(required = false) LocalDate dateTo,
                                          @RequestParam(required = false) String search,
                                          Pageable pageable) {
        return service.searchSupplierPayments(supplierId, method, dateFrom, dateTo, search, pageable);
    }
}
```

- [ ] **Step 5: Commit**

```bash
git add backend/payment-service/src/main/java/io/smartpos/payment/api/dto/SupplierPaymentDto.java \
        backend/payment-service/src/main/java/io/smartpos/payment/api/SupplierPaymentController.java \
        backend/payment-service/src/main/java/io/smartpos/payment/application/PaymentService.java \
        backend/payment-service/src/main/java/io/smartpos/payment/domain/repository/PaymentRepository.java
git commit -m "feat(payment): add supplier payments list endpoint"
```

---

## Phase 5: Frontend API Layer

### Task 5.1: Add types and API functions

**Files:**
- Modify: `frontend/src/api/smartpos/types.ts`
- Modify: `frontend/src/api/smartpos/sales.ts`
- Create: `frontend/src/api/smartpos/payments.ts` (if not exists, otherwise modify)

- [ ] **Step 1: Add types to types.ts**

```typescript
// Add after existing types:

export interface SuspendedSale {
  id: UUID;
  ref: string;
  tenantId: UUID;
  terminalId?: UUID | null;
  userId?: UUID | null;
  customerId?: UUID | null;
  warehouseId?: UUID | null;
  lines: string; // JSON string of cart lines
  discountType?: 'FIXED' | 'PERCENT' | null;
  discountValue?: number | null;
  taxMethod?: 'INCLUSIVE' | 'EXCLUSIVE' | null;
  notes?: string | null;
  status: 'OPEN' | 'RESUMED' | 'EXPIRED';
  grandTotal: number;
  totalItems: number;
  expiresAt: string;
  createdAt: string;
}

export interface GoodsReceived {
  id: UUID;
  ref: string;
  date: string;
  supplierId?: UUID | null;
  warehouseId: UUID;
  status: string;
  grandTotal: number;
  totalOrderedQty: number;
  totalReceivedQty: number;
  lines: GoodsReceivedLine[];
  receivedAt?: string | null;
}

export interface GoodsReceivedLine {
  id: UUID;
  productId: UUID;
  productName: string;
  productCode?: string | null;
  orderedQty: number;
  receivedQty: number;
  remainingQty: number;
}

export interface SupplierPayment {
  paymentId: UUID;
  supplierId: UUID;
  supplierName: string;
  purchaseId: UUID;
  purchaseRef: string;
  amount: number;
  method: string;
  reference?: string | null;
  date: string;
  accountId: UUID;
  accountName: string;
}
```

- [ ] **Step 2: Add API functions to sales.ts**

```typescript
// ─── Suspended Sales ───

export interface SuspendedSaleSearchParams {
  search?: string;
  status?: 'OPEN' | 'RESUMED' | 'EXPIRED';
  page?: number;
  size?: number;
}

export async function listSuspendedSales(params: SuspendedSaleSearchParams = {}): Promise<Page<SuspendedSale>> {
  const { data } = await api.get<Page<SuspendedSale>>('/api/v1/suspended-sales', { params });
  return data;
}

export async function getSuspendedSale(id: UUID): Promise<SuspendedSale> {
  const { data } = await api.get<SuspendedSale>(`/api/v1/suspended-sales/${id}`);
  return data;
}

export interface SuspendCartBody {
  tenantId: UUID;
  terminalId?: UUID;
  customerId?: UUID;
  warehouseId: UUID;
  lines: string;
  discountType?: string;
  discountValue?: number;
  taxMethod?: string;
  notes?: string;
  grandTotal: number;
  totalItems: number;
}

export async function suspendCart(body: SuspendCartBody): Promise<SuspendedSale> {
  const { data } = await api.post<SuspendedSale>('/api/v1/suspended-sales', body);
  return data;
}

export async function resumeSuspendedSale(id: UUID): Promise<SuspendedSale> {
  const { data } = await api.post<SuspendedSale>(`/api/v1/suspended-sales/${id}/resume`);
  return data;
}

export async function deleteSuspendedSale(id: UUID): Promise<void> {
  await api.delete(`/api/v1/suspended-sales/${id}`);
}

export async function purgeExpiredSuspendedSales(): Promise<string> {
  const { data } = await api.delete<string>('/api/v1/suspended-sales/expired');
  return data;
}

// ─── Goods Received ───

export interface GoodsReceivedSearchParams {
  supplierId?: UUID;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  size?: number;
}

export async function listGoodsReceived(params: GoodsReceivedSearchParams = {}): Promise<Page<GoodsReceived>> {
  const { data } = await api.get<Page<GoodsReceived>>('/api/v1/purchases/receiving', { params });
  return data;
}

export interface ReceiveLineBody {
  lineId: UUID;
  receivedQty: number;
}

export async function receivePurchaseLine(purchaseId: UUID, body: ReceiveLineBody): Promise<GoodsReceived> {
  const { data } = await api.post<GoodsReceived>(`/api/v1/purchases/${purchaseId}/receive-line`, body);
  return data;
}

// ─── Supplier Returns (list/search) ───

export interface PurchaseReturnSearchParams {
  search?: string;
  status?: string;
  supplierId?: UUID;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  size?: number;
}

export async function searchPurchaseReturns(params: PurchaseReturnSearchParams = {}): Promise<Page<PurchaseReturn>> {
  const { data } = await api.get<Page<PurchaseReturn>>('/api/v1/purchase-returns', { params });
  return data;
}

export async function completePurchaseReturn(id: UUID): Promise<PurchaseReturn> {
  const { data } = await api.post<PurchaseReturn>(`/api/v1/purchase-returns/${id}/complete`);
  return data;
}
```

- [ ] **Step 3: Add supplier payment API to payments.ts**

```typescript
// Add to payments.ts:

import type { Page, SupplierPayment, UUID } from './types';

export interface SupplierPaymentSearchParams {
  supplierId?: UUID;
  method?: string;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
  page?: number;
  size?: number;
}

export async function listSupplierPayments(params: SupplierPaymentSearchParams = {}): Promise<Page<SupplierPayment>> {
  const { data } = await api.get<Page<SupplierPayment>>('/api/v1/payments/supplier', { params });
  return data;
}
```

- [ ] **Step 4: Commit**

```bash
git add frontend/src/api/smartpos/types.ts \
        frontend/src/api/smartpos/sales.ts \
        frontend/src/api/smartpos/payments.ts
git commit -m "feat(frontend): add API types and functions for 4 new features"
```

---

## Phase 6: Frontend Pages

### Task 6.1: Create SuspendedSalesPage

**Files:**
- Create: `frontend/src/views/smartpos/sales/SuspendedSalesPage.tsx`

Reuse existing component patterns: PageHeader, DataTable, FilterBar, BulkActionBar, EditDrawer.

- [ ] **Step 1: Create the page**

```tsx
import { useEffect, useMemo, useState } from 'react';
import { Alert, Box, Button, Chip, Stack, Typography } from '@mui/material';
import { IconClock, IconTrash, IconPlayerPlay, IconEye } from '@tabler/icons-react';
import { useNavigate } from 'react-router';
import { useTranslation } from 'react-i18next';

import {
  listSuspendedSales, resumeSuspendedSale, deleteSuspendedSale,
  purgeExpiredSuspendedSales,
  type SuspendedSale,
} from 'src/api/smartpos/sales';
import { PageHeader } from 'src/components/smartpos/PageHeader';
import DataTable, { type Column } from 'src/components/smartpos/DataTable';
import FilterBar from 'src/components/smartpos/FilterBar';
import BulkActionBar from 'src/components/smartpos/BulkActionBar';
import EditDrawer from 'src/components/smartpos/EditDrawer';
import { useSelection } from 'src/components/smartpos/useSelection';
import { brand } from 'src/theme/smartpos/brand';
import { formatMoney } from 'src/utils/smartpos/currency';

const fmt = formatMoney;
const PAGE_SIZE = 20;

const RESUME_CART_KEY = 'smartpos.pos.resumeCart';

export default function SuspendedSalesPage() {
  const { t } = useTranslation('smartpos');
  const nav = useNavigate();
  const [rows, setRows] = useState<SuspendedSale[]>([]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [refreshToken, setRefreshToken] = useState(0);
  const sel = useSelection(rows);

  const [detailTarget, setDetailTarget] = useState<SuspendedSale | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    listSuspendedSales({ search: search || undefined, page, size: PAGE_SIZE })
      .then((p) => { if (!cancelled) { setRows(p.content); setTotalPages(p.totalPages || 1); } })
      .catch((e) => { if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [search, page, refreshToken]);

  const handleResume = async (s: SuspendedSale) => {
    try {
      const resumed = await resumeSuspendedSale(s.id);
      localStorage.setItem(RESUME_CART_KEY, resumed.lines);
      nav('/smartpos/sales/pos');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Resume failed');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteSuspendedSale(id);
      setRefreshToken((n) => n + 1);
      sel.clearSelection();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Delete failed');
    }
  };

  const handleBatchDelete = async () => {
    try {
      await Promise.all(Array.from(sel.selectedIds).map((id) => deleteSuspendedSale(id)));
      setRefreshToken((n) => n + 1);
      sel.clearSelection();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Batch delete failed');
    }
  };

  const openCount = rows.filter((r) => r.status === 'OPEN').length;

  const columns: Column<SuspendedSale>[] = useMemo(() => [
    sel.selectionColumn(),
    {
      key: '_num', label: '#', width: 48, align: 'center', enableHiding: false, sortable: false,
      render: (_, i) => (
        <Typography sx={{ fontWeight: 700, fontSize: '0.75rem', color: brand.neutral[400], fontFamily: "'DM Mono', 'Courier New', monospace" }}>
          {page * PAGE_SIZE + i + 1}
        </Typography>
      ),
    },
    {
      key: 'ref', label: 'Hold Ref', width: 160,
      render: (s) => (
        <Typography sx={{ fontWeight: 700, fontFamily: "'DM Mono', 'Courier New', monospace", fontSize: '0.8rem', color: brand.neutral[800] }}>
          {s.ref}
        </Typography>
      ),
    },
    { key: 'totalItems', label: 'Items', width: 70, align: 'center', render: (s) => s.totalItems },
    {
      key: 'grandTotal', label: 'Total', width: 120, align: 'right',
      render: (s) => (
        <Typography sx={{ fontWeight: 700, fontFamily: "'DM Mono', 'Courier New', monospace", fontSize: '0.82rem' }}>
          {fmt(s.grandTotal)}
        </Typography>
      ),
    },
    {
      key: 'status', label: 'Status', width: 100, align: 'center',
      render: (s) => (
        <Chip
          label={s.status}
          size="small"
          sx={{
            height: 22, fontWeight: 700, fontSize: '0.65rem',
            bgcolor: s.status === 'OPEN' ? brand.primary[50] : brand.neutral[100],
            color: s.status === 'OPEN' ? brand.primary[700] : brand.neutral[500],
            borderRadius: '6px',
          }}
        />
      ),
    },
    {
      key: 'createdAt', label: 'Created', width: 140,
      render: (s) => new Date(s.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }),
    },
    {
      key: 'expiresAt', label: 'Expires', width: 140,
      render: (s) => {
        const exp = new Date(s.expiresAt);
        const overdue = exp < new Date();
        return (
          <Stack spacing={0.25}>
            <Typography variant="body2" sx={{ fontWeight: 500, fontSize: '0.8125rem' }}>
              {exp.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
            </Typography>
            {overdue && (
              <Typography variant="caption" sx={{ color: brand.operational.critical.text, fontWeight: 600 }}>
                Expired
              </Typography>
            )}
          </Stack>
        );
      },
    },
    {
      key: 'actions', label: '', align: 'right', width: 150, enableHiding: false,
      render: (s) => (
        <Stack direction="row" spacing={0.5} justifyContent="flex-end" onClick={(e) => e.stopPropagation()}>
          <Button size="small" startIcon={<IconPlayerPlay size={14} />}
            onClick={() => handleResume(s)}
            sx={{ textTransform: 'none', fontWeight: 600, fontSize: '0.75rem' }}>
            Resume
          </Button>
          <Button size="small" startIcon={<IconEye size={14} />}
            onClick={() => setDetailTarget(s)}
            sx={{ textTransform: 'none', fontWeight: 600, fontSize: '0.75rem' }}>
            View
          </Button>
          <Button size="small" color="error" startIcon={<IconTrash size={14} />}
            onClick={() => handleDelete(s.id)}
            sx={{ textTransform: 'none', fontWeight: 600, fontSize: '0.75rem' }}>
            Discard
          </Button>
        </Stack>
      ),
    },
  ], [page, sel]);

  return (
    <Box>
      <PageHeader
        title="Suspended Sales"
        subtitle="Carts on hold from POS terminals. Resume from any terminal."
        badge={openCount > 0 ? { label: `${openCount} open`, tone: 'info' } : undefined}
        actions={[
          { label: 'Purge expired', icon: <IconTrash size={18} />,
            onClick: async () => { await purgeExpiredSuspendedSales(); setRefreshToken((n) => n + 1); }
          },
        ]}
      />
      <FilterBar
        searchPlaceholder="Search by hold ref…"
        searchValue={search}
        onSearchChange={(v) => { setSearch(v); setPage(0); }}
        activeFilters={search ? [{ key: 'search', label: `Search: ${search}`, clear: () => { setSearch(''); setPage(0); } }] : []}
        onClearAll={() => { setSearch(''); setPage(0); }}
      />
      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>}
      {sel.selectedIds.size > 0 && (
        <BulkActionBar selectedCount={sel.selectedIds.size} onClear={sel.clearSelection} itemLabel="hold">
          <Button size="small" variant="outlined" color="error" startIcon={<IconTrash size={14} />} onClick={handleBatchDelete}>
            Discard selected
          </Button>
        </BulkActionBar>
      )}
      <DataTable
        columns={columns}
        rows={rows}
        loading={loading}
        page={page}
        totalPages={totalPages}
        onPageChange={setPage}
        getRowKey={(s) => s.id}
        emptyText="No suspended sales"
        enableExport
        exportFileName="suspended-sales"
        toolbarTitle="Suspended sales"
      />
      <EditDrawer
        open={!!detailTarget}
        title={detailTarget ? `Hold ${detailTarget.ref}` : ''}
        subtitle={detailTarget ? new Date(detailTarget.createdAt).toLocaleString() : ''}
        onClose={() => setDetailTarget(null)}
      >
        {detailTarget && (
          <Box>
            <Typography variant="body2" sx={{ mb: 1 }}>Items: {detailTarget.totalItems}</Typography>
            <Typography variant="body2" sx={{ mb: 1 }}>Total: {fmt(detailTarget.grandTotal)}</Typography>
            <Typography variant="body2" sx={{ mb: 1 }}>Status: {detailTarget.status}</Typography>
            <Typography variant="body2">Expires: {new Date(detailTarget.expiresAt).toLocaleString()}</Typography>
          </Box>
        )}
      </EditDrawer>
    </Box>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/views/smartpos/sales/SuspendedSalesPage.tsx
git commit -m "feat(frontend): add SuspendedSalesPage"
```

---

### Task 6.2: Create GoodsReceivedPage

**Files:**
- Create: `frontend/src/views/smartpos/purchases/GoodsReceivedPage.tsx`

- [ ] **Step 1: Create the page**

```tsx
import { useEffect, useMemo, useState } from 'react';
import { Alert, Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle, Stack, TextField, Typography } from '@mui/material';
import { IconTruckDelivery, IconPackage } from '@tabler/icons-react';
import { useNavigate } from 'react-router';
import { useTranslation } from 'react-i18next';

import {
  listGoodsReceived, receivePurchaseLine,
  type GoodsReceived, type GoodsReceivedLine,
} from 'src/api/smartpos/sales';
import { listSuppliers } from 'src/api/smartpos/suppliers';
import type { Supplier } from 'src/api/smartpos/types';
import { PageHeader } from 'src/components/smartpos/PageHeader';
import DataTable, { type Column } from 'src/components/smartpos/DataTable';
import FilterBar from 'src/components/smartpos/FilterBar';
import { brand } from 'src/theme/smartpos/brand';

const PAGE_SIZE = 20;

const STATUS_TONE: Record<string, { bg: string; fg: string }> = {
  ORDERED: { bg: brand.warning.light, fg: brand.warning.dark },
  RECEIVED: { bg: brand.success.light, fg: brand.success.dark },
  CANCELLED: { bg: brand.error.light, fg: brand.error.dark },
};

export default function GoodsReceivedPage() {
  const { t } = useTranslation('smartpos');
  const nav = useNavigate();
  const [rows, setRows] = useState<GoodsReceived[]>([]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [supplierId, setSupplierId] = useState<string>('');
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [refreshToken, setRefreshToken] = useState(0);

  const [receiveTarget, setReceiveTarget] = useState<GoodsReceived | null>(null);
  const [receiveQtys, setReceiveQtys] = useState<Record<string, string>>({});
  const [receiving, setReceiving] = useState(false);

  useEffect(() => { listSuppliers({ size: 200 }).then((p) => setSuppliers(p.content)).catch(() => {}); }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    listGoodsReceived({ supplierId: supplierId || undefined, page, size: PAGE_SIZE })
      .then((p) => { if (!cancelled) { setRows(p.content); setTotalPages(p.totalPages || 1); } })
      .catch((e) => { if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [supplierId, page, refreshToken]);

  const openReceive = (g: GoodsReceived) => {
    setReceiveTarget(g);
    const qtys: Record<string, string> = {};
    g.lines.forEach((l) => { qtys[l.id] = String(l.remainingQty); });
    setReceiveQtys(qtys);
  };

  const handleReceive = async () => {
    if (!receiveTarget) return;
    setReceiving(true);
    try {
      for (const line of receiveTarget.lines) {
        const qty = parseFloat(receiveQtys[line.id] || '0');
        if (qty > 0) {
          await receivePurchaseLine(receiveTarget.id, { lineId: line.id, receivedQty: qty });
        }
      }
      setReceiveTarget(null);
      setRefreshToken((n) => n + 1);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Receive failed');
    } finally {
      setReceiving(false);
    }
  };

  const columns: Column<GoodsReceived>[] = useMemo(() => [
    {
      key: '_num', label: '#', width: 48, align: 'center', enableHiding: false, sortable: false,
      render: (_, i) => (
        <Typography sx={{ fontWeight: 700, fontSize: '0.75rem', color: brand.neutral[400], fontFamily: "'DM Mono', 'Courier New', monospace" }}>
          {page * PAGE_SIZE + i + 1}
        </Typography>
      ),
    },
    {
      key: 'ref', label: 'PO Ref', width: 160,
      render: (g) => (
        <Typography sx={{ fontWeight: 700, fontFamily: "'DM Mono', 'Courier New', monospace", fontSize: '0.8rem', color: brand.neutral[800] }}>
          {g.ref}
        </Typography>
      ),
    },
    {
      key: 'supplierId', label: 'Supplier', width: 160,
      render: (g) => suppliers.find((s) => s.id === g.supplierId)?.name ?? '—',
    },
    {
      key: 'date', label: 'Date', width: 110,
      render: (g) => new Date(g.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
    },
    {
      key: 'totalOrderedQty', label: 'Ordered', width: 90, align: 'right',
      render: (g) => <Typography sx={{ fontWeight: 600, fontSize: '0.8125rem' }}>{g.totalOrderedQty}</Typography>,
    },
    {
      key: 'totalReceivedQty', label: 'Received', width: 90, align: 'right',
      render: (g) => <Typography sx={{ fontWeight: 600, fontSize: '0.8125rem', color: brand.success.dark }}>{g.totalReceivedQty}</Typography>,
    },
    {
      key: 'remaining', label: 'Remaining', width: 90, align: 'right',
      render: (g) => {
        const rem = g.totalOrderedQty - g.totalReceivedQty;
        return (
          <Typography sx={{ fontWeight: 600, fontSize: '0.8125rem', color: rem > 0 ? brand.warning.dark : brand.neutral[400] }}>
            {rem}
          </Typography>
        );
      },
    },
    {
      key: 'status', label: 'Status', width: 100, align: 'center',
      render: (g) => {
        const t = STATUS_TONE[g.status] ?? STATUS_TONE.ORDERED;
        return <Chip label={g.status} size="small" sx={{ height: 22, fontWeight: 700, fontSize: '0.65rem', bgcolor: t.bg, color: t.fg, borderRadius: '6px' }} />;
      },
    },
    {
      key: 'actions', label: '', align: 'right', width: 100, enableHiding: false,
      render: (g) => (
        <Stack direction="row" spacing={0.5} justifyContent="flex-end" onClick={(e) => e.stopPropagation()}>
          <Button size="small" startIcon={<IconPackage size={14} />}
            onClick={() => openReceive(g)}
            disabled={g.status === 'CANCELLED' || g.status === 'RECEIVED'}
            sx={{ textTransform: 'none', fontWeight: 600, fontSize: '0.75rem' }}>
            Receive
          </Button>
        </Stack>
      ),
    },
  ], [page, suppliers]);

  return (
    <Box>
      <PageHeader title="Goods Received" subtitle="Track received inventory against purchase orders" />
      <Stack direction="row" spacing={1.5} sx={{ mb: 2 }}>
        <TextField select size="small" label="Supplier" value={supplierId}
          onChange={(e) => { setSupplierId(e.target.value); setPage(0); }} sx={{ minWidth: 200 }}>
          <MenuItem value="">All suppliers</MenuItem>
          {suppliers.map((s) => <MenuItem key={s.id} value={s.id}>{s.name}</MenuItem>)}
        </TextField>
      </Stack>
      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>}
      <DataTable
        columns={columns} rows={rows} loading={loading}
        page={page} totalPages={totalPages} onPageChange={setPage}
        getRowKey={(g) => g.id}
        onRowClick={(g) => nav(`/smartpos/purchases/${g.id}/edit`)}
        emptyText="No goods received in this view"
        enableExport exportFileName="goods-received"
        toolbarTitle="Goods received"
      />
      <Dialog open={!!receiveTarget} onClose={() => setReceiveTarget(null)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Receive Items — {receiveTarget?.ref}</DialogTitle>
        <DialogContent>
          {receiveTarget?.lines.map((l: GoodsReceivedLine) => (
            <Stack key={l.id} direction="row" spacing={2} alignItems="center" sx={{ mb: 1.5 }}>
              <Box sx={{ flex: 1 }}>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>{l.productName}</Typography>
                <Typography variant="caption" sx={{ color: brand.neutral[500] }}>
                  Ordered: {l.orderedQty} | Already received: {l.receivedQty} | Remaining: {l.remainingQty}
                </Typography>
              </Box>
              <TextField
                type="number" size="small"
                value={receiveQtys[l.id] ?? ''}
                onChange={(e) => setReceiveQtys((prev) => ({ ...prev, [l.id]: e.target.value }))}
                sx={{ width: 100 }}
                inputProps={{ min: 0, max: l.remainingQty, step: 0.01 }}
              />
            </Stack>
          ))}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setReceiveTarget(null)} disabled={receiving}>Cancel</Button>
          <Button variant="contained" onClick={handleReceive} disabled={receiving}>
            {receiving ? 'Receiving…' : 'Confirm Receive'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/views/smartpos/purchases/GoodsReceivedPage.tsx
git commit -m "feat(frontend): add GoodsReceivedPage"
```

---

### Task 6.3: Create SupplierReturnsPage

**Files:**
- Create: `frontend/src/views/smartpos/purchases/SupplierReturnsPage.tsx`

- [ ] **Step 1: Create the page**

```tsx
import { useEffect, useMemo, useState } from 'react';
import { Alert, Box, Button, Chip, MenuItem, Stack, TextField, Typography } from '@mui/material';
import { IconArrowBackUp, IconCheck } from '@tabler/icons-react';
import { useNavigate } from 'react-router';
import { useTranslation } from 'react-i18next';

import {
  searchPurchaseReturns, completePurchaseReturn,
  type PurchaseReturn, type PurchaseReturnLine,
} from 'src/api/smartpos/sales';
import { listSuppliers } from 'src/api/smartpos/suppliers';
import type { Supplier } from 'src/api/smartpos/types';
import { PageHeader } from 'src/components/smartpos/PageHeader';
import DataTable, { type Column } from 'src/components/smartpos/DataTable';
import DocumentActionsBar from 'src/components/smartpos/documents/DocumentActionsBar';
import { brand } from 'src/theme/smartpos/brand';
import { formatMoney } from 'src/utils/smartpos/currency';

const fmt = formatMoney;
const PAGE_SIZE = 20;

const STATUS_TONE: Record<string, { bg: string; fg: string }> = {
  DRAFT: { bg: brand.warning.light, fg: brand.warning.dark },
  CONFIRMED: { bg: brand.success.light, fg: brand.success.dark },
  CANCELLED: { bg: brand.neutral[100], fg: brand.neutral[500] },
};

export default function SupplierReturnsPage() {
  const { t } = useTranslation('smartpos');
  const nav = useNavigate();
  const [rows, setRows] = useState<PurchaseReturn[]>([]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<string>('');
  const [supplierId, setSupplierId] = useState<string>('');
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [refreshToken, setRefreshToken] = useState(0);

  useEffect(() => { listSuppliers({ size: 200 }).then((p) => setSuppliers(p.content)).catch(() => {}); }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    searchPurchaseReturns({
      search: search || undefined,
      status: (status || undefined) as PurchaseReturn['status'] | undefined,
      supplierId: supplierId || undefined,
      page, size: PAGE_SIZE,
    })
      .then((p) => { if (!cancelled) { setRows(p.content); setTotalPages(p.totalPages || 1); } })
      .catch((e) => { if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [search, status, supplierId, page, refreshToken]);

  const handleComplete = async (id: string) => {
    try { await completePurchaseReturn(id); setRefreshToken((n) => n + 1); }
    catch (e) { setError(e instanceof Error ? e.message : 'Complete failed'); }
  };

  const pendingCount = rows.filter((r) => r.status === 'DRAFT').length;

  const columns: Column<PurchaseReturn>[] = useMemo(() => [
    {
      key: '_num', label: '#', width: 48, align: 'center', enableHiding: false, sortable: false,
      render: (_, i) => (
        <Typography sx={{ fontWeight: 700, fontSize: '0.75rem', color: brand.neutral[400], fontFamily: "'DM Mono', 'Courier New', monospace" }}>
          {page * PAGE_SIZE + i + 1}
        </Typography>
      ),
    },
    {
      key: 'ref', label: 'Return', width: 180,
      render: (r) => (
        <Stack direction="row" spacing={1.5} alignItems="center">
          <Box sx={{ width: 36, height: 36, borderRadius: '10px', bgcolor: brand.warning.light, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <IconArrowBackUp size={16} color={brand.warning.dark} stroke={1.8} />
          </Box>
          <Typography sx={{ fontWeight: 700, fontFamily: "'DM Mono', 'Courier New', monospace", fontSize: '0.8rem', color: brand.neutral[800] }}>
            {r.ref}
          </Typography>
        </Stack>
      ),
    },
    {
      key: 'supplierId', label: 'Supplier', width: 160,
      render: (r) => (r as any).supplierName ?? suppliers.find((s) => s.id === (r as any).supplierId)?.name ?? '—',
    },
    {
      key: 'purchaseId', label: 'Purchase', width: 120,
      render: (r) => (
        <Typography sx={{ fontFamily: "'DM Mono', 'Courier New', monospace", fontSize: '0.75rem', color: brand.neutral[500] }}>
          {(r as any).purchaseId?.slice(0, 8)}…
        </Typography>
      ),
    },
    { key: 'lines', label: 'Lines', width: 70, align: 'right', render: (r) => r.lines?.length ?? 0 },
    {
      key: 'grandTotal', label: 'Total', width: 120, align: 'right',
      render: (r) => (
        <Typography sx={{ fontWeight: 700, fontFamily: "'DM Mono', 'Courier New', monospace", fontSize: '0.82rem', color: brand.operational.critical.text }}>
          {fmt(r.grandTotal)}
        </Typography>
      ),
    },
    {
      key: 'status', label: 'Status', width: 110, align: 'center',
      render: (r) => {
        const c = STATUS_TONE[r.status as string] ?? STATUS_TONE.DRAFT;
        return <Chip label={r.status} size="small" sx={{ height: 22, fontWeight: 700, fontSize: '0.65rem', bgcolor: c.bg, color: c.fg, borderRadius: '6px' }} />;
      },
    },
    {
      key: 'date', label: 'Date', width: 110,
      render: (r) => new Date(r.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
    },
    {
      key: 'actions', label: '', align: 'right', width: 120, enableHiding: false,
      render: (r) => (
        <Stack direction="row" spacing={0.5} justifyContent="flex-end" onClick={(e) => e.stopPropagation()}>
          <DocumentActionsBar documentType="credit-note" referenceType="purchase-return" referenceId={r.id} />
          {r.status === 'DRAFT' && (
            <Button size="small" startIcon={<IconCheck size={14} />}
              onClick={() => handleComplete(r.id)}
              sx={{ textTransform: 'none', fontWeight: 600, fontSize: '0.75rem', color: brand.success.dark }}>
              Complete
            </Button>
          )}
        </Stack>
      ),
    },
  ], [page, suppliers]);

  return (
    <Box>
      <PageHeader
        title="Supplier Returns"
        subtitle="Goods returned to suppliers against purchase orders"
        badge={pendingCount > 0 ? { label: `${pendingCount} pending`, tone: 'warning' } : undefined}
      />
      <Stack direction="row" spacing={1.5} sx={{ mb: 2 }}>
        <TextField select size="small" label="Status" value={status}
          onChange={(e) => { setStatus(e.target.value); setPage(0); }} sx={{ minWidth: 160 }}>
          <MenuItem value="">All</MenuItem>
          <MenuItem value="DRAFT">Pending</MenuItem>
          <MenuItem value="CONFIRMED">Completed</MenuItem>
          <MenuItem value="CANCELLED">Cancelled</MenuItem>
        </TextField>
        <TextField select size="small" label="Supplier" value={supplierId}
          onChange={(e) => { setSupplierId(e.target.value); setPage(0); }} sx={{ minWidth: 200 }}>
          <MenuItem value="">All suppliers</MenuItem>
          {suppliers.map((s) => <MenuItem key={s.id} value={s.id}>{s.name}</MenuItem>)}
        </TextField>
      </Stack>
      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>}
      <DataTable
        columns={columns} rows={rows} loading={loading}
        page={page} totalPages={totalPages} onPageChange={setPage}
        getRowKey={(r) => r.id}
        onRowClick={(r) => nav(`/smartpos/purchases/${(r as any).purchaseId}/edit`)}
        emptyText="No supplier returns in this view"
        enableExport exportFileName="supplier-returns"
        toolbarTitle="Supplier returns"
      />
    </Box>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/views/smartpos/purchases/SupplierReturnsPage.tsx
git commit -m "feat(frontend): add SupplierReturnsPage"
```

---

### Task 6.4: Create SupplierPaymentsPage

**Files:**
- Create: `frontend/src/views/smartpos/money/SupplierPaymentsPage.tsx`

- [ ] **Step 1: Create the page**

```tsx
import { useEffect, useMemo, useState } from 'react';
import { Alert, Box, Chip, MenuItem, Stack, TextField, Typography } from '@mui/material';
import { IconCoin } from '@tabler/icons-react';
import { useNavigate } from 'react-router';
import { useTranslation } from 'react-i18next';

import { listSupplierPayments, type SupplierPayment } from 'src/api/smartpos/payments';
import { listSuppliers } from 'src/api/smartpos/suppliers';
import type { Supplier } from 'src/api/smartpos/types';
import { PageHeader } from 'src/components/smartpos/PageHeader';
import DataTable, { type Column } from 'src/components/smartpos/DataTable';
import { brand } from 'src/theme/smartpos/brand';
import { formatMoney } from 'src/utils/smartpos/currency';

const fmt = formatMoney;
const PAGE_SIZE = 20;

const METHOD_COLOURS: Record<string, string> = {
  CASH: brand.success.dark,
  BANK_TRANSFER: brand.info.dark,
  MOBILE_MONEY: brand.accent[700],
  CHEQUE: brand.warning.dark,
};

export default function SupplierPaymentsPage() {
  const { t } = useTranslation('smartpos');
  const nav = useNavigate();
  const [rows, setRows] = useState<SupplierPayment[]>([]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [supplierId, setSupplierId] = useState<string>('');
  const [method, setMethod] = useState<string>('');
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [refreshToken, setRefreshToken] = useState(0);

  useEffect(() => { listSuppliers({ size: 200 }).then((p) => setSuppliers(p.content)).catch(() => {}); }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    listSupplierPayments({
      supplierId: supplierId || undefined,
      method: method || undefined,
      search: search || undefined,
      page, size: PAGE_SIZE,
    })
      .then((p) => { if (!cancelled) { setRows(p.content); setTotalPages(p.totalPages || 1); } })
      .catch((e) => { if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [supplierId, method, search, page, refreshToken]);

  const columns: Column<SupplierPayment>[] = useMemo(() => [
    {
      key: '_num', label: '#', width: 48, align: 'center', enableHiding: false, sortable: false,
      render: (_, i) => (
        <Typography sx={{ fontWeight: 700, fontSize: '0.75rem', color: brand.neutral[400], fontFamily: "'DM Mono', 'Courier New', monospace" }}>
          {page * PAGE_SIZE + i + 1}
        </Typography>
      ),
    },
    { key: 'supplierName', label: 'Supplier', width: 160, render: (p) => <Typography variant="body2" sx={{ fontWeight: 600 }}>{p.supplierName}</Typography> },
    {
      key: 'purchaseRef', label: 'Purchase', width: 150,
      render: (p) => (
        <Typography sx={{ fontFamily: "'DM Mono', 'Courier New', monospace", fontSize: '0.8rem', fontWeight: 600, color: brand.neutral[700] }}>
          {p.purchaseRef}
        </Typography>
      ),
    },
    {
      key: 'amount', label: 'Amount', width: 120, align: 'right',
      render: (p) => (
        <Typography sx={{ fontWeight: 700, fontFamily: "'DM Mono', 'Courier New', monospace", fontSize: '0.82rem', color: brand.neutral[800] }}>
          {fmt(p.amount)}
        </Typography>
      ),
    },
    {
      key: 'method', label: 'Method', width: 120, align: 'center',
      render: (p) => (
        <Chip label={p.method} size="small"
          sx={{ height: 22, fontWeight: 700, fontSize: '0.65rem', bgcolor: brand.neutral[100], color: METHOD_COLOURS[p.method] ?? brand.neutral[600], borderRadius: '6px' }}
        />
      ),
    },
    { key: 'accountName', label: 'Account', width: 140, render: (p) => <Typography variant="body2">{p.accountName}</Typography> },
    {
      key: 'date', label: 'Date', width: 110,
      render: (p) => new Date(p.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
    },
    {
      key: 'reference', label: 'Reference', width: 150,
      render: (p) => p.reference ? <Typography variant="body2" sx={{ fontFamily: "'DM Mono', 'Courier New', monospace", fontSize: '0.75rem' }}>{p.reference}</Typography> : <Typography sx={{ color: brand.neutral[400] }}>—</Typography>,
    },
  ], [page]);

  return (
    <Box>
      <PageHeader title="Supplier Payments" subtitle="Track all payments made to suppliers" />
      <Stack direction="row" spacing={1.5} sx={{ mb: 2 }}>
        <TextField select size="small" label="Supplier" value={supplierId}
          onChange={(e) => { setSupplierId(e.target.value); setPage(0); }} sx={{ minWidth: 200 }}>
          <MenuItem value="">All suppliers</MenuItem>
          {suppliers.map((s) => <MenuItem key={s.id} value={s.id}>{s.name}</MenuItem>)}
        </TextField>
        <TextField select size="small" label="Method" value={method}
          onChange={(e) => { setMethod(e.target.value); setPage(0); }} sx={{ minWidth: 160 }}>
          <MenuItem value="">All methods</MenuItem>
          <MenuItem value="CASH">Cash</MenuItem>
          <MenuItem value="BANK_TRANSFER">Bank Transfer</MenuItem>
          <MenuItem value="MOBILE_MONEY">Mobile Money</MenuItem>
          <MenuItem value="CHEQUE">Cheque</MenuItem>
        </TextField>
      </Stack>
      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>}
      <DataTable
        columns={columns} rows={rows} loading={loading}
        page={page} totalPages={totalPages} onPageChange={setPage}
        getRowKey={(p) => p.paymentId}
        onRowClick={(p) => nav(`/smartpos/purchases/${p.purchaseId}/edit`)}
        emptyText="No supplier payments found"
        enableExport exportFileName="supplier-payments"
        toolbarTitle="Supplier payments"
      />
    </Box>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/views/smartpos/money/SupplierPaymentsPage.tsx
git commit -m "feat(frontend): add SupplierPaymentsPage"
```

---

## Phase 7: Menu + Router Integration

### Task 7.1: Update SmartPosMenuItems and Router

**Files:**
- Modify: `frontend/src/layouts/full/vertical/sidebar/SmartPosMenuItems.ts`
- Modify: `frontend/src/routes/Router.tsx`

- [ ] **Step 1: In SmartPosMenuItems.ts, replace the 4 "soon" entries**

```typescript
// Replace "Suspended Sales" soon entry with:
{ id: uid(), title: 'Suspended Sales', icon: IconClock, href: '/smartpos/sales/suspended' },

// Replace "Goods Received" soon entry with:
{ id: uid(), title: 'Goods Received', icon: IconPackage, href: '/smartpos/purchases/received' },

// Replace "Supplier Returns" soon entry with:
{ id: uid(), title: 'Supplier Returns', icon: IconArrowBackUp, href: '/smartpos/purchases/returns' },

// Replace "Supplier Payments" soon entry with:
{ id: uid(), title: 'Supplier Payments', icon: IconCoin, href: '/smartpos/supplier-payments' },
```

- [ ] **Step 2: In Router.tsx, add lazy imports**

```typescript
const SmartPosSuspendedSales = Loadable(
  lazy(() => import('../views/smartpos/sales/SuspendedSalesPage')),
);
const SmartPosGoodsReceived = Loadable(
  lazy(() => import('../views/smartpos/purchases/GoodsReceivedPage')),
);
const SmartPosSupplierReturns = Loadable(
  lazy(() => import('../views/smartpos/purchases/SupplierReturnsPage')),
);
const SmartPosSupplierPayments = Loadable(
  lazy(() => import('../views/smartpos/money/SupplierPaymentsPage')),
);
```

- [ ] **Step 3: Add routes in the SmartPOS children array**

```typescript
{ path: 'sales/suspended', element: <SmartPosSuspendedSales /> },
{ path: 'purchases/received', element: <SmartPosGoodsReceived /> },
{ path: 'purchases/returns', element: <SmartPosSupplierReturns /> },
{ path: 'supplier-payments', element: <SmartPosSupplierPayments /> },
```

- [ ] **Step 4: Commit**

```bash
git add frontend/src/layouts/full/vertical/sidebar/SmartPosMenuItems.ts \
        frontend/src/routes/Router.tsx
git commit -m "feat(frontend): wire up 4 new features in menu and router"
```

---

## Phase 8: POS Terminal — Integrate Suspend/Resume

### Task 8.1: Add suspend button and resume handler to POS terminal

**Files:**
- Modify: `frontend/src/views/smartpos/pos/PosTerminalPage.tsx`

- [ ] **Step 1: Add suspend cart function**

```typescript
// Add import:
import { suspendCart } from 'src/api/smartpos/sales';

// Add suspend handler (inside PosTerminalPage component):
const handleSuspend = async () => {
  if (lines.length === 0) return;
  try {
    await suspendCart({
      tenantId: user!.tenantId,
      terminalId: terminalId || undefined,
      customerId: selectedCustomer?.id,
      warehouseId: warehouseId,
      lines: JSON.stringify(lines),
      discountType: discountType || undefined,
      discountValue: discountValue || undefined,
      taxMethod: taxMethod || undefined,
      notes: notes || undefined,
      grandTotal: grandTotal,
      totalItems: lines.reduce((sum, l) => sum + l.qty, 0),
    });
    setLines([]);
    setSelectedCustomer(null);
    // Show success snackbar
  } catch (e) {
    // Show error
  }
};

// On mount, check for resume cart:
useEffect(() => {
  const resumeJson = localStorage.getItem('smartpos.pos.resumeCart');
  if (resumeJson) {
    try {
      const cartLines = JSON.parse(resumeJson);
      setLines(cartLines);
      localStorage.removeItem('smartpos.pos.resumeCart');
    } catch { /* ignore */ }
  }
}, []);
```

Add a "Suspend" button to the POS terminal toolbar.

- [ ] **Step 2: Commit**

```bash
git add frontend/src/views/smartpos/pos/PosTerminalPage.tsx
git commit -m "feat(pos): add suspend/resume cart integration in POS terminal"
```
```

---

- [ ] **Step 5: Final verification — run builds**

```bash
cd backend && mvn -pl sales-service,payment-service compile -q
cd frontend && npm run build
```
