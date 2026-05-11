# Branches + Billing Foundation — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the optional Branch model, realign billing plans with the landing page, scaffold the billing-service, and implement the full tenant lifecycle state machine.

**Architecture:** Branches live in inventory-service (optional branchId on Warehouse). Billing plans are restructured in auth-service. A new billing-service (port 8094) manages plan definitions and subscription state. Tenant lifecycle (trial tracking, suspend/reactivate/close) is fully implemented in auth-service with new endpoints.

**Tech Stack:** Java 21, Spring Boot 3.x, JPA/Hibernate, React 19 + TypeScript, MUI 6

---

## File Map

### Backend — auth-service
| File | Action | Responsibility |
|---|---|---|
| `backend/auth-service/.../domain/model/BillingPlan.java` | Modify | Restructure enum: FREE (fallback), STARTER, BUSINESS, PROFESSIONAL, ENTERPRISE |
| `backend/auth-service/.../domain/model/TenantStatus.java` | Modify | Add `TRIAL`, `TRIAL_EXPIRED`, `PAST_DUE` statuses |
| `backend/auth-service/.../domain/model/Tenant.java` | Modify | Add `trialEndsAt`, `statusChangedAt`, `statusReason` fields; update plan-to-limits mapping |
| `backend/auth-service/.../application/TenantService.java` | Modify | Add lifecycle methods: suspend, reactivate, close; trial expiry checks; new plan limits |
| `backend/auth-service/.../api/TenantController.java` | Modify | Add admin endpoints for lifecycle actions and list-all |
| `backend/auth-service/.../api/dto/` | Create | New DTOs for lifecycle requests/responses |
| `backend/auth-service/src/main/resources/db/migration/` | Create | V2 migration for new fields |

### Backend — inventory-service
| File | Action | Responsibility |
|---|---|---|
| `backend/inventory-service/.../domain/model/Branch.java` | Create | Branch entity |
| `backend/inventory-service/.../domain/model/Warehouse.java` | Modify | Add optional `branchId` field |
| `backend/inventory-service/.../domain/repository/BranchRepository.java` | Create | Branch JPA repository |
| `backend/inventory-service/.../api/BranchController.java` | Create | Branch CRUD endpoints |
| `backend/inventory-service/.../api/WarehouseController.java` | Modify | Accept `branchId` in create/update |
| `backend/inventory-service/src/main/resources/db/migration/` | Create | Migration for branches table + warehouse.branchId |

### Backend — billing-service (new)
| File | Action | Responsibility |
|---|---|---|
| `backend/billing-service/pom.xml` | Create | Maven project |
| `backend/billing-service/src/main/java/.../BillingApplication.java` | Create | Spring Boot entry point |
| `backend/billing-service/src/main/resources/application.yml` | Create | Service config |
| `backend/billing-service/.../domain/model/PlanDefinition.java` | Create | Plan entity with features matrix |
| `backend/billing-service/.../domain/model/Subscription.java` | Create | Tenant subscription entity |
| `backend/billing-service/.../domain/model/Invoice.java` | Create | Invoice entity |
| `backend/billing-service/.../domain/repository/` | Create | Repositories |
| `backend/billing-service/.../api/PlanController.java` | Create | Plan definition endpoints |
| `backend/billing-service/.../api/SubscriptionController.java` | Create | Subscription management endpoints |

### Backend — gateway
| File | Action | Responsibility |
|---|---|---|
| `backend/gateway/src/main/resources/application.yml` | Modify | Add billing-service and branch routes |

### Frontend
| File | Action | Responsibility |
|---|---|---|
| `frontend/src/layouts/.../SmartPosMenuItems.ts` | Modify | Activate Branches + Billing menu items; move Users & Roles to Administration |
| `frontend/src/routes/Router.tsx` | Modify | Add branch and billing routes |
| `frontend/src/api/smartpos/branches.ts` | Create | Branch API client |
| `frontend/src/api/smartpos/billing.ts` | Create | Billing API client |
| `frontend/src/api/smartpos/auth.ts` | Modify | Update Tenant type with new fields |
| `frontend/src/views/smartpos/settings/BranchesPage.tsx` | Create | Branch CRUD page |
| `frontend/src/views/smartpos/settings/BillingPage.tsx` | Create | Billing dashboard page |
| `frontend/src/views/smartpos/settings/BillingPlansPage.tsx` | Create | Plan comparison/management page |
| `frontend/src/views/smartpos/settings/SettingsPlaceholder.tsx` | Modify | Update TenantsSettings: add lifecycle actions, update plan names |

---

### Task 1: Restructure BillingPlan enum

**Files:**
- Modify: `backend/auth-service/src/main/java/io/smartpos/auth/domain/model/BillingPlan.java`

- [ ] **Step 1: Rewrite BillingPlan enum**

```java
package io.smartpos.auth.domain.model;

public enum BillingPlan {
    FREE,         // Fallback — trial expired without subscribing. 1 user, 1 store, 100 products.
    STARTER,      // TZS 15K/mo — 5 users, 1 store, 1K products
    BUSINESS,     // TZS 35K/mo — 20 users, 5 stores, 10K products
    PROFESSIONAL, // TZS 79K/mo — 100 users, 25 stores, 50K products
    ENTERPRISE    // TZS 250K/mo — unlimited
}
```

- [ ] **Step 2: Commit**

```bash
git add backend/auth-service/src/main/java/io/smartpos/auth/domain/model/BillingPlan.java
git commit -m "refactor: restructure BillingPlan enum to align with landing page tiers"
```

### Task 2: Expand TenantStatus enum

**Files:**
- Modify: `backend/auth-service/src/main/java/io/smartpos/auth/domain/model/TenantStatus.java`

- [ ] **Step 1: Rewrite TenantStatus enum**

```java
package io.smartpos.auth.domain.model;

public enum TenantStatus {
    TRIAL,         // 30-day active trial — full features, no payment needed
    TRIAL_EXPIRED, // Trial ended without subscribing — downgraded to FREE plan
    ACTIVE,        // Paid and current
    PAST_DUE,      // Payment failed — 7-day grace period, services still work
    SUSPENDED,     // Account locked — all access blocked, data preserved
    CLOSED         // Permanently closed — data retained 90 days then purged
}
```

- [ ] **Step 2: Commit**

```bash
git add backend/auth-service/src/main/java/io/smartpos/auth/domain/model/TenantStatus.java
git commit -m "feat: expand TenantStatus enum with trial and billing lifecycle states"
```

### Task 3: Add Tenant fields for lifecycle tracking

**Files:**
- Modify: `backend/auth-service/src/main/java/io/smartpos/auth/domain/model/Tenant.java`
- Create: `backend/auth-service/src/main/resources/db/migration/V2__add_tenant_lifecycle_fields.sql`

- [ ] **Step 1: Write the Flyway migration**

```sql
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS status_changed_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS status_reason VARCHAR(500);

-- Set trial_ends_at to 30 days from creation for existing TRIAL tenants (none yet, safe)
UPDATE tenants SET trial_ends_at = created_at + INTERVAL '30 days'
  WHERE status = 'ACTIVE' AND billing_plan = 'FREE' AND trial_ends_at IS NULL;
```

- [ ] **Step 2: Update Tenant entity**

```java
@Entity
@Table(name = "tenants")
@Getter @Setter
@NoArgsConstructor @AllArgsConstructor
@Builder
public class Tenant {
    @Id private UUID id;

    @Column(length = 120)
    private String name;

    @Column(length = 80, unique = true)
    private String slug;

    @Enumerated(EnumType.STRING)
    private TenantStatus status;

    @Enumerated(EnumType.STRING)
    private BillingPlan billingPlan;

    private int maxUsers;
    private int maxStores;

    @Column(columnDefinition = "jsonb")
    private String settings;

    private Instant trialEndsAt;
    private Instant statusChangedAt;

    @Column(length = 500)
    private String statusReason;

    private Instant createdAt;
    private Instant updatedAt;

    @PrePersist
    void onCreate() {
        if (id == null) id = UUID.randomUUID();
        createdAt = Instant.now();
        updatedAt = Instant.now();
        if (status == null) status = TenantStatus.TRIAL;
        if (billingPlan == null) billingPlan = BillingPlan.STARTER;
        if (trialEndsAt == null) trialEndsAt = createdAt.plus(30, ChronoUnit.DAYS);
        if (statusChangedAt == null) statusChangedAt = createdAt;
        deriveLimits();
    }

    @PreUpdate
    void onUpdate() {
        updatedAt = Instant.now();
    }

    public boolean isActive() {
        return status == TenantStatus.ACTIVE || status == TenantStatus.TRIAL;
    }

    public boolean isBlocked() {
        return status == TenantStatus.SUSPENDED || status == TenantStatus.CLOSED;
    }

    public void deriveLimits() {
        switch (billingPlan) {
            case FREE -> { maxUsers = 1; maxStores = 1; }
            case STARTER -> { maxUsers = 5; maxStores = 1; }
            case BUSINESS -> { maxUsers = 20; maxStores = 5; }
            case PROFESSIONAL -> { maxUsers = 100; maxStores = 25; }
            case ENTERPRISE -> { maxUsers = Integer.MAX_VALUE; maxStores = Integer.MAX_VALUE; }
        }
    }

    public boolean isTrialExpired() {
        return status == TenantStatus.TRIAL && trialEndsAt != null && Instant.now().isAfter(trialEndsAt);
    }
}
```

- [ ] **Step 3: Commit**

```bash
git add backend/auth-service/src/main/resources/db/migration/V2__add_tenant_lifecycle_fields.sql \
        backend/auth-service/src/main/java/io/smartpos/auth/domain/model/Tenant.java
git commit -m "feat: add trial tracking and lifecycle fields to Tenant"
```

### Task 4: Update TenantService for plan limits and lifecycle methods

**Files:**
- Modify: `backend/auth-service/src/main/java/io/smartpos/auth/application/TenantService.java`

- [ ] **Step 1: Replace the plan-to-limits helpers and add lifecycle methods**

Read the current file first, then replace the `planToMaxUsers`/`planToMaxStores` methods and add new lifecycle methods.

```java
package io.smartpos.auth.application;

import io.smartpos.auth.domain.model.BillingPlan;
import io.smartpos.auth.domain.model.Tenant;
import io.smartpos.auth.domain.model.TenantStatus;
import io.smartpos.auth.domain.repository.TenantRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.text.Normalizer;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class TenantService {

    private final TenantRepository tenantRepository;

    @Transactional
    public Tenant create(String name, String slug, BillingPlan plan) {
        Tenant tenant = Tenant.builder()
            .name(name)
            .slug(Optional.ofNullable(slug).orElseGet(() -> slugify(name)))
            .status(TenantStatus.TRIAL)
            .billingPlan(plan != null ? plan : BillingPlan.STARTER)
            .settings("{}")
            .build();
        tenant.deriveLimits();

        if (tenantRepository.existsBySlugIgnoreCase(tenant.getSlug())) {
            throw new IllegalArgumentException("A tenant with slug '" + tenant.getSlug() + "' already exists");
        }

        Tenant saved = tenantRepository.save(tenant);
        log.info("Tenant created: id={}, slug={}, plan={}", saved.getId(), saved.getSlug(), saved.getBillingPlan());
        return saved;
    }

    public Tenant getById(UUID id) {
        return tenantRepository.findById(id)
            .orElseThrow(() -> new IllegalArgumentException("Tenant not found: " + id));
    }

    public List<Tenant> listAll() {
        return tenantRepository.findAll();
    }

    @Transactional
    public Tenant update(UUID id, String name, String slug, BillingPlan plan) {
        Tenant tenant = getById(id);
        if (name != null) tenant.setName(name);
        if (slug != null) {
            if (!slug.equals(tenant.getSlug()) && tenantRepository.existsBySlugIgnoreCase(slug)) {
                throw new IllegalArgumentException("A tenant with slug '" + slug + "' already exists");
            }
            tenant.setSlug(slug);
        }
        if (plan != null && plan != tenant.getBillingPlan()) {
            tenant.setBillingPlan(plan);
            tenant.deriveLimits();
        }
        return tenantRepository.save(tenant);
    }

    // ── Lifecycle methods ──────────────────────────────────────────────────────

    @Transactional
    public Tenant suspend(UUID id, String reason) {
        Tenant tenant = getById(id);
        if (tenant.getStatus() == TenantStatus.SUSPENDED) {
            throw new IllegalStateException("Tenant is already suspended");
        }
        tenant.setStatus(TenantStatus.SUSPENDED);
        tenant.setStatusChangedAt(Instant.now());
        tenant.setStatusReason(reason);
        log.warn("Tenant suspended: id={}, reason={}", id, reason);
        return tenantRepository.save(tenant);
    }

    @Transactional
    public Tenant reactivate(UUID id) {
        Tenant tenant = getById(id);
        if (tenant.getStatus() != TenantStatus.SUSPENDED && tenant.getStatus() != TenantStatus.TRIAL_EXPIRED) {
            throw new IllegalStateException("Tenant is not suspended or trial-expired");
        }
        tenant.setStatus(TenantStatus.ACTIVE);
        tenant.setStatusChangedAt(Instant.now());
        tenant.setStatusReason(null);
        log.info("Tenant reactivated: id={}", id);
        return tenantRepository.save(tenant);
    }

    @Transactional
    public Tenant close(UUID id, String reason) {
        Tenant tenant = getById(id);
        tenant.setStatus(TenantStatus.CLOSED);
        tenant.setStatusChangedAt(Instant.now());
        tenant.setStatusReason(reason);
        log.warn("Tenant closed: id={}, reason={}", id, reason);
        return tenantRepository.save(tenant);
    }

    @Transactional
    public Tenant handleTrialExpiry(UUID id) {
        Tenant tenant = getById(id);
        if (tenant.getStatus() == TenantStatus.TRIAL && tenant.isTrialExpired()) {
            tenant.setStatus(TenantStatus.TRIAL_EXPIRED);
            tenant.setBillingPlan(BillingPlan.FREE);
            tenant.deriveLimits();
            tenant.setStatusChangedAt(Instant.now());
            tenant.setStatusReason("Trial period ended");
            log.info("Trial expired for tenant: id={}", id);
            return tenantRepository.save(tenant);
        }
        return tenant;
    }

    @Transactional
    public Tenant markPastDue(UUID id) {
        Tenant tenant = getById(id);
        if (tenant.getStatus() != TenantStatus.ACTIVE) {
            throw new IllegalStateException("Only active tenants can become past due");
        }
        tenant.setStatus(TenantStatus.PAST_DUE);
        tenant.setStatusChangedAt(Instant.now());
        tenant.setStatusReason("Payment failed");
        log.warn("Tenant marked past due: id={}", id);
        return tenantRepository.save(tenant);
    }

    @Transactional
    public Tenant restoreFromPastDue(UUID id) {
        Tenant tenant = getById(id);
        if (tenant.getStatus() != TenantStatus.PAST_DUE) {
            throw new IllegalStateException("Tenant is not past due");
        }
        tenant.setStatus(TenantStatus.ACTIVE);
        tenant.setStatusChangedAt(Instant.now());
        tenant.setStatusReason(null);
        log.info("Tenant restored from past due: id={}", id);
        return tenantRepository.save(tenant);
    }

    /**
     * Scheduled job: expire trials that have passed their end date.
     * Called by a @Scheduled method or external scheduler.
     */
    @Transactional
    public int expireTrials() {
        List<Tenant> expiredTrials = tenantRepository
            .findByStatusAndTrialEndsAtBefore(TenantStatus.TRIAL, Instant.now());
        for (Tenant t : expiredTrials) {
            handleTrialExpiry(t.getId());
        }
        return expiredTrials.size();
    }

    /**
     * Scheduled job: suspend tenants that have been past due for more than 7 days.
     */
    @Transactional
    public int suspendPastDueAccounts() {
        Instant cutoff = Instant.now().minus(7, ChronoUnit.DAYS);
        List<Tenant> pastDue = tenantRepository
            .findByStatusAndStatusChangedAtBefore(TenantStatus.PAST_DUE, cutoff);
        for (Tenant t : pastDue) {
            t.setStatus(TenantStatus.SUSPENDED);
            t.setStatusChangedAt(Instant.now());
            t.setStatusReason("Payment grace period expired");
            tenantRepository.save(t);
        }
        return pastDue.size();
    }

    // ── Utilities ──────────────────────────────────────────────────────────────

    public static String slugify(String input) {
        if (input == null) return "";
        String normalized = Normalizer.normalize(input, Normalizer.Form.NFD);
        String stripped = normalized.replaceAll("\\p{InCombiningDiacriticalMarks}+", "");
        return stripped.toLowerCase()
            .replaceAll("[^a-z0-9]+", "-")
            .replaceAll("^-|-$", "");
    }
}
```

- [ ] **Step 2: Add repository query methods**

Read the current `TenantRepository.java` and add missing query methods:

```java
package io.smartpos.auth.domain.repository;

import io.smartpos.auth.domain.model.Tenant;
import io.smartpos.auth.domain.model.TenantStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public interface TenantRepository extends JpaRepository<Tenant, UUID> {
    boolean existsBySlugIgnoreCase(String slug);
    List<Tenant> findByStatusAndTrialEndsAtBefore(TenantStatus status, Instant before);
    List<Tenant> findByStatusAndStatusChangedAtBefore(TenantStatus status, Instant before);
}
```

- [ ] **Step 3: Commit**

```bash
git add backend/auth-service/src/main/java/io/smartpos/auth/application/TenantService.java \
        backend/auth-service/src/main/java/io/smartpos/auth/domain/repository/TenantRepository.java
git commit -m "feat: add tenant lifecycle methods — suspend, reactivate, close, trial expiry, past-due"
```

### Task 5: Add admin tenant lifecycle endpoints to TenantController

**Files:**
- Modify: `backend/auth-service/src/main/java/io/smartpos/auth/api/TenantController.java`

- [ ] **Step 1: Add admin lifecycle endpoints**

Read the current controller, then add these new endpoints:

```java
// Add to existing TenantController:

@GetMapping("/admin/all")
@PreAuthorize("hasAuthority('admin')")
public ResponseEntity<List<Tenant>> listAll() {
    return ResponseEntity.ok(tenantService.listAll());
}

@PostMapping("/{id}/suspend")
@PreAuthorize("hasAuthority('tenant.suspend')")
public ResponseEntity<Tenant> suspend(
        @PathVariable UUID id,
        @RequestBody @Valid SuspendRequest request) {
    return ResponseEntity.ok(tenantService.suspend(id, request.reason()));
}

@PostMapping("/{id}/reactivate")
@PreAuthorize("hasAuthority('tenant.suspend')")
public ResponseEntity<Tenant> reactivate(@PathVariable UUID id) {
    return ResponseEntity.ok(tenantService.reactivate(id));
}

@PostMapping("/{id}/close")
@PreAuthorize("hasAuthority('tenant.suspend')")
public ResponseEntity<Tenant> close(
        @PathVariable UUID id,
        @RequestBody @Valid CloseRequest request) {
    return ResponseEntity.ok(tenantService.close(id, request.reason()));
}

// New DTO:
public record SuspendRequest(@NotBlank String reason) {}
public record CloseRequest(@NotBlank String reason) {}
```

- [ ] **Step 2: Commit**

```bash
git add backend/auth-service/src/main/java/io/smartpos/auth/api/TenantController.java \
        backend/auth-service/src/main/java/io/smartpos/auth/api/dto/
git commit -m "feat: add admin tenant lifecycle endpoints — suspend, reactivate, close, list-all"
```

### Task 6: Scaffold billing-service

**Files:**
- Create: `backend/billing-service/pom.xml`
- Create: `backend/billing-service/src/main/java/io/smartpos/billing/BillingApplication.java`
- Create: `backend/billing-service/src/main/resources/application.yml`

- [ ] **Step 1: Create Maven POM**

```xml
<?xml version="1.0" encoding="UTF-8"?>
<project xmlns="http://maven.apache.org/POM/4.0.0"
         xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
         xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 https://maven.apache.org/xsd/maven-4.0.0.xsd">
    <modelVersion>4.0.0</modelVersion>
    <parent>
        <groupId>io.smartpos</groupId>
        <artifactId>smartpos-backend</artifactId>
        <version>1.0.0</version>
    </parent>
    <artifactId>billing-service</artifactId>
    <name>billing-service</name>

    <dependencies>
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-web</artifactId>
        </dependency>
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-data-jpa</artifactId>
        </dependency>
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-validation</artifactId>
        </dependency>
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-security</artifactId>
        </dependency>
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-oauth2-resource-server</artifactId>
        </dependency>
        <dependency>
            <groupId>org.postgresql</groupId>
            <artifactId>postgresql</artifactId>
        </dependency>
        <dependency>
            <groupId>org.flywaydb</groupId>
            <artifactId>flyway-database-postgresql</artifactId>
        </dependency>
    </dependencies>
</project>
```

- [ ] **Step 2: Create Spring Boot application class**

```java
package io.smartpos.billing;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
public class BillingApplication {
    public static void main(String[] args) {
        SpringApplication.run(BillingApplication.class, args);
    }
}
```

- [ ] **Step 3: Create application.yml**

```yaml
server:
  port: 8094

spring:
  application:
    name: billing-service
  datasource:
    url: jdbc:postgresql://localhost:5434/billing_db
    username: ${DB_USERNAME:smartpos}
    password: ${DB_PASSWORD:smartpos}
  jpa:
    hibernate:
      ddl-auto: validate
    open-in-view: false
  flyway:
    enabled: true
    baseline-on-migrate: true

smartpos:
  internal:
    shared-secret: ${INTERNAL_SHARED_SECRET:dev-internal-token-change-me}
  auth-service:
    base-url: http://localhost:8081
```

- [ ] **Step 4: Commit**

```bash
git add backend/billing-service/
git commit -m "feat: scaffold billing-service (port 8094)"
```

### Task 7: Add billing-service domain models

**Files:**
- Create: `backend/billing-service/src/main/java/io/smartpos/billing/domain/model/PlanDefinition.java`
- Create: `backend/billing-service/src/main/java/io/smartpos/billing/domain/model/Subscription.java`
- Create: `backend/billing-service/src/main/java/io/smartpos/billing/domain/model/Invoice.java`
- Create: `backend/billing-service/src/main/java/io/smartpos/billing/domain/repository/PlanDefinitionRepository.java`
- Create: `backend/billing-service/src/main/java/io/smartpos/billing/domain/repository/SubscriptionRepository.java`
- Create: `backend/billing-service/src/main/java/io/smartpos/billing/domain/repository/InvoiceRepository.java`
- Create: `backend/billing-service/src/main/resources/db/migration/V1__init_billing_schema.sql`

- [ ] **Step 1: Create the Flyway migration**

```sql
CREATE TABLE plan_definitions (
    id UUID PRIMARY KEY,
    code VARCHAR(20) NOT NULL UNIQUE,        -- FREE, STARTER, BUSINESS, PROFESSIONAL, ENTERPRISE
    label VARCHAR(50) NOT NULL,
    description TEXT,
    monthly_price_tzs BIGINT,                -- price in Tanzanian Shillings
    annual_price_tzs BIGINT,                 -- 10x monthly (2 months free)
    max_users INT NOT NULL DEFAULT 5,
    max_stores INT NOT NULL DEFAULT 1,
    max_products INT NOT NULL DEFAULT 1000,
    features JSONB NOT NULL DEFAULT '{}',    -- {"accounting": false, "reports": "basic", ...}
    is_public BOOLEAN NOT NULL DEFAULT TRUE,
    sort_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE subscriptions (
    id UUID PRIMARY KEY,
    tenant_id UUID NOT NULL UNIQUE,
    plan_code VARCHAR(20) NOT NULL REFERENCES plan_definitions(code),
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',  -- ACTIVE, PAST_DUE, CANCELLED
    billing_cycle VARCHAR(10) NOT NULL DEFAULT 'MONTHLY', -- MONTHLY, ANNUAL
    current_period_start TIMESTAMPTZ NOT NULL,
    current_period_end TIMESTAMPTZ NOT NULL,
    cancelled_at TIMESTAMPTZ,
    stripe_subscription_id VARCHAR(100),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE invoices (
    id UUID PRIMARY KEY,
    tenant_id UUID NOT NULL,
    subscription_id UUID REFERENCES subscriptions(id),
    invoice_number VARCHAR(50) NOT NULL UNIQUE,
    amount_tzs BIGINT NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING',  -- PENDING, PAID, OVERDUE, CANCELLED
    payment_method VARCHAR(30),                      -- STRIPE, MPESA, TIGO_PESA, AIRTEL_MONEY, BANK_TRANSFER, CASH
    payment_reference VARCHAR(100),
    due_date TIMESTAMPTZ NOT NULL,
    paid_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed plan definitions
INSERT INTO plan_definitions (id, code, label, description, monthly_price_tzs, annual_price_tzs, max_users, max_stores, max_products, features, sort_order) VALUES
  (gen_random_uuid(), 'FREE', 'Free', 'Limited fallback plan for expired trials', 0, 0, 1, 1, 100, '{"accounting":false,"purchases":false,"reports":"none","hrm":false,"api":false,"multi_currency":false,"multi_company":false,"white_label":false,"support":"community"}', 0),
  (gen_random_uuid(), 'STARTER', 'Starter', 'Basic POS and stock management', 15000, 150000, 5, 1, 1000, '{"accounting":false,"purchases":false,"reports":"none","hrm":false,"api":false,"multi_currency":false,"multi_company":false,"white_label":false,"support":"email"}', 1),
  (gen_random_uuid(), 'BUSINESS', 'Business', 'Full retail suite with accounting and reports', 35000, 350000, 20, 5, 10000, '{"accounting":true,"purchases":true,"reports":"full","hrm":false,"api":false,"multi_currency":false,"multi_company":false,"white_label":false,"support":"priority_email"}', 2),
  (gen_random_uuid(), 'PROFESSIONAL', 'Professional', 'Advanced features with HRM, API access, and multi-currency', 79000, 790000, 100, 25, 50000, '{"accounting":true,"purchases":true,"reports":"full_export","hrm":true,"api":true,"multi_currency":true,"multi_company":false,"white_label":false,"support":"chat_phone"}', 3),
  (gen_random_uuid(), 'ENTERPRISE', 'Enterprise', 'Unlimited everything with dedicated support', 250000, null, 2147483647, 2147483647, 2147483647, '{"accounting":true,"purchases":true,"reports":"full_custom","hrm":true,"api":true,"multi_currency":true,"multi_company":true,"white_label":true,"support":"dedicated_am"}', 4);
```

- [ ] **Step 2: Create PlanDefinition entity**

```java
package io.smartpos.billing.domain.model;

import jakarta.persistence.*;
import lombok.*;
import java.util.UUID;

@Entity @Table(name = "plan_definitions")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class PlanDefinition {
    @Id private UUID id;

    @Column(length = 20, unique = true, nullable = false)
    private String code;

    @Column(length = 50, nullable = false)
    private String label;

    @Column(columnDefinition = "TEXT")
    private String description;

    private Long monthlyPriceTzs;
    private Long annualPriceTzs;
    private int maxUsers;
    private int maxStores;
    private int maxProducts;

    @Column(columnDefinition = "jsonb")
    private String features;

    private boolean isPublic;
    private int sortOrder;

    @PrePersist void onCreate() { if (id == null) id = UUID.randomUUID(); }
}
```

- [ ] **Step 3: Create Subscription entity**

```java
package io.smartpos.billing.domain.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.Instant;
import java.util.UUID;

@Entity @Table(name = "subscriptions")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Subscription {
    @Id private UUID id;
    private UUID tenantId;

    @Column(length = 20, nullable = false)
    private String planCode;

    @Column(length = 20, nullable = false)
    private String status;  // ACTIVE, PAST_DUE, CANCELLED

    @Column(length = 10, nullable = false)
    private String billingCycle;  // MONTHLY, ANNUAL

    private Instant currentPeriodStart;
    private Instant currentPeriodEnd;
    private Instant cancelledAt;

    @Column(length = 100)
    private String stripeSubscriptionId;

    private Instant createdAt;
    private Instant updatedAt;

    @PrePersist void onCreate() {
        if (id == null) id = UUID.randomUUID();
        createdAt = Instant.now();
        updatedAt = Instant.now();
    }

    @PreUpdate void onUpdate() { updatedAt = Instant.now(); }
}
```

- [ ] **Step 4: Create Invoice entity**

```java
package io.smartpos.billing.domain.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.Instant;
import java.util.UUID;

@Entity @Table(name = "invoices")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Invoice {
    @Id private UUID id;
    private UUID tenantId;
    private UUID subscriptionId;

    @Column(length = 50, unique = true, nullable = false)
    private String invoiceNumber;

    private long amountTzs;

    @Column(length = 20, nullable = false)
    private String status;  // PENDING, PAID, OVERDUE, CANCELLED

    @Column(length = 30)
    private String paymentMethod;

    @Column(length = 100)
    private String paymentReference;

    private Instant dueDate;
    private Instant paidAt;
    private Instant createdAt;

    @PrePersist void onCreate() {
        if (id == null) id = UUID.randomUUID();
        if (createdAt == null) createdAt = Instant.now();
    }
}
```

- [ ] **Step 5: Create repositories**

```java
package io.smartpos.billing.domain.repository;

import io.smartpos.billing.domain.model.PlanDefinition;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface PlanDefinitionRepository extends JpaRepository<PlanDefinition, UUID> {
    Optional<PlanDefinition> findByCode(String code);
    List<PlanDefinition> findByIsPublicTrueOrderBySortOrderAsc();
}
```

```java
package io.smartpos.billing.domain.repository;

import io.smartpos.billing.domain.model.Subscription;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;
import java.util.UUID;

public interface SubscriptionRepository extends JpaRepository<Subscription, UUID> {
    Optional<Subscription> findByTenantId(UUID tenantId);
    Optional<Subscription> findByStripeSubscriptionId(String stripeSubscriptionId);
}
```

```java
package io.smartpos.billing.domain.repository;

import io.smartpos.billing.domain.model.Invoice;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.UUID;

public interface InvoiceRepository extends JpaRepository<Invoice, UUID> {
    List<Invoice> findByTenantIdOrderByCreatedAtDesc(UUID tenantId);
    List<Invoice> findByStatus(String status);
}
```

- [ ] **Step 6: Commit**

```bash
git add backend/billing-service/src/main/java/io/smartpos/billing/domain/ \
        backend/billing-service/src/main/resources/db/migration/
git commit -m "feat: add billing domain models — PlanDefinition, Subscription, Invoice"
```

### Task 8: Add billing-service API controllers and security config

**Files:**
- Create: `backend/billing-service/src/main/java/io/smartpos/billing/api/PlanController.java`
- Create: `backend/billing-service/src/main/java/io/smartpos/billing/api/SubscriptionController.java`
- Create: `backend/billing-service/src/main/java/io/smartpos/billing/infrastructure/SecurityConfig.java`

- [ ] **Step 1: Create PlanController**

```java
package io.smartpos.billing.api;

import io.smartpos.billing.domain.model.PlanDefinition;
import io.smartpos.billing.domain.repository.PlanDefinitionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/v1/billing/plans")
@RequiredArgsConstructor
public class PlanController {

    private final PlanDefinitionRepository planRepo;

    @GetMapping
    public ResponseEntity<List<PlanDefinition>> listPublic() {
        return ResponseEntity.ok(planRepo.findByIsPublicTrueOrderBySortOrderAsc());
    }

    @GetMapping("/admin")
    @PreAuthorize("hasAuthority('admin')")
    public ResponseEntity<List<PlanDefinition>> listAll() {
        return ResponseEntity.ok(planRepo.findAll());
    }

    @PutMapping("/admin/{code}")
    @PreAuthorize("hasAuthority('billing.manage')")
    public ResponseEntity<PlanDefinition> update(@PathVariable String code, @RequestBody PlanDefinition update) {
        PlanDefinition plan = planRepo.findByCode(code)
            .orElseThrow(() -> new IllegalArgumentException("Plan not found: " + code));
        plan.setLabel(update.getLabel());
        plan.setDescription(update.getDescription());
        plan.setMonthlyPriceTzs(update.getMonthlyPriceTzs());
        plan.setAnnualPriceTzs(update.getAnnualPriceTzs());
        plan.setFeatures(update.getFeatures());
        return ResponseEntity.ok(planRepo.save(plan));
    }
}
```

- [ ] **Step 2: Create SubscriptionController**

```java
package io.smartpos.billing.api;

import io.smartpos.billing.domain.model.Subscription;
import io.smartpos.billing.domain.repository.SubscriptionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/billing/subscriptions")
@RequiredArgsConstructor
public class SubscriptionController {

    private final SubscriptionRepository subscriptionRepo;

    @GetMapping("/tenant/{tenantId}")
    @PreAuthorize("hasAuthority('billing.view') or @tenantOwnershipCheck.isCurrentTenant(#tenantId)")
    public ResponseEntity<Subscription> getByTenant(@PathVariable UUID tenantId) {
        return subscriptionRepo.findByTenantId(tenantId)
            .map(ResponseEntity::ok)
            .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping("/admin")
    @PreAuthorize("hasAuthority('billing.manage')")
    public ResponseEntity<Subscription> create(@RequestBody Subscription subscription) {
        return ResponseEntity.ok(subscriptionRepo.save(subscription));
    }

    @PatchMapping("/admin/{id}")
    @PreAuthorize("hasAuthority('billing.manage')")
    public ResponseEntity<Subscription> update(@PathVariable UUID id, @RequestBody Subscription update) {
        Subscription sub = subscriptionRepo.findById(id)
            .orElseThrow(() -> new IllegalArgumentException("Subscription not found: " + id));
        if (update.getPlanCode() != null) sub.setPlanCode(update.getPlanCode());
        if (update.getStatus() != null) sub.setStatus(update.getStatus());
        if (update.getBillingCycle() != null) sub.setBillingCycle(update.getBillingCycle());
        return ResponseEntity.ok(subscriptionRepo.save(sub));
    }
}
```

- [ ] **Step 3: Create SecurityConfig**

```java
package io.smartpos.billing.infrastructure;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationConverter;
import org.springframework.security.oauth2.server.resource.authentication.JwtGrantedAuthoritiesConverter;
import org.springframework.security.web.SecurityFilterChain;

@Configuration
@EnableWebSecurity
@EnableMethodSecurity
public class SecurityConfig {

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        return http
            .csrf(csrf -> csrf.disable())
            .authorizeHttpRequests(auth -> auth
                .requestMatchers("/api/v1/billing/plans").permitAll()
                .anyRequest().authenticated())
            .oauth2ResourceServer(oauth2 -> oauth2
                .jwt(jwt -> jwt.jwtAuthenticationConverter(jwtAuthenticationConverter())))
            .build();
    }

    private JwtAuthenticationConverter jwtAuthenticationConverter() {
        JwtGrantedAuthoritiesConverter grantedAuthorities = new JwtGrantedAuthoritiesConverter();
        grantedAuthorities.setAuthoritiesClaimName("authorities");
        grantedAuthorities.setAuthorityPrefix("");
        JwtAuthenticationConverter converter = new JwtAuthenticationConverter();
        converter.setJwtGrantedAuthoritiesConverter(grantedAuthorities);
        return converter;
    }
}
```

- [ ] **Step 4: Commit**

```bash
git add backend/billing-service/src/main/java/io/smartpos/billing/api/ \
        backend/billing-service/src/main/java/io/smartpos/billing/infrastructure/
git commit -m "feat: add billing API controllers and security config"
```

### Task 9: Register billing-service and branch routes in gateway

**Files:**
- Modify: `backend/gateway/src/main/resources/application.yml`

- [ ] **Step 1: Add billing-service and branch routes to gateway application.yml**

Insert after the existing document-service route:

```yaml
        # ── Billing service ─────────────────────────────────────────────
        - id: billing-service-public
          uri: ${BILLING_URI:http://localhost:8094}
          predicates:
            - Path=/api/v1/billing/plans
          filters:
            - name: Retry
              args: { retries: 2 }

        - id: billing-service
          uri: ${BILLING_URI:http://localhost:8094}
          predicates:
            - Path=/api/v1/billing/**
          filters:
            - name: Retry
              args: { retries: 2 }

        # ── Branch routes (inventory-service) ───────────────────────────
        - id: inventory-service-branches
          uri: ${INVENTORY_URI:http://localhost:8084}
          predicates:
            - Path=/api/v1/branches/**
          filters:
            - name: Retry
              args: { retries: 2 }
```

- [ ] **Step 2: Commit**

```bash
git add backend/gateway/src/main/resources/application.yml
git commit -m "feat: add billing-service and branch routes to gateway"
```

### Task 10: Create Branch entity in inventory-service

**Files:**
- Create: `backend/inventory-service/src/main/java/io/smartpos/inventory/domain/model/Branch.java`
- Create: `backend/inventory-service/src/main/java/io/smartpos/inventory/domain/repository/BranchRepository.java`
- Create: `backend/inventory-service/src/main/resources/db/migration/V5__add_branches.sql`
- Modify: `backend/inventory-service/src/main/java/io/smartpos/inventory/domain/model/Warehouse.java`

- [ ] **Step 1: Create Flyway migration**

```sql
CREATE TABLE branches (
    id UUID PRIMARY KEY,
    name VARCHAR(120) NOT NULL,
    code VARCHAR(30) NOT NULL,
    address VARCHAR(255),
    city VARCHAR(100),
    phone VARCHAR(30),
    active BOOLEAN NOT NULL DEFAULT TRUE,
    tenant_id UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(tenant_id, code)
);

ALTER TABLE warehouses ADD COLUMN IF NOT EXISTS branch_id UUID REFERENCES branches(id);
```

- [ ] **Step 2: Create Branch entity**

```java
package io.smartpos.inventory.domain.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "branches")
@Getter @Setter
@NoArgsConstructor @AllArgsConstructor
@Builder
public class Branch {
    @Id
    private UUID id;

    @Column(length = 120, nullable = false)
    private String name;

    @Column(length = 30, nullable = false)
    private String code;

    @Column(length = 255)
    private String address;

    @Column(length = 100)
    private String city;

    @Column(length = 30)
    private String phone;

    private boolean active;

    @Column(name = "tenant_id", nullable = false)
    private UUID tenantId;

    private Instant createdAt;

    @PrePersist
    void onCreate() {
        if (id == null) id = UUID.randomUUID();
        if (createdAt == null) createdAt = Instant.now();
    }
}
```

- [ ] **Step 3: Create BranchRepository**

```java
package io.smartpos.inventory.domain.repository;

import io.smartpos.inventory.domain.model.Branch;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.UUID;

public interface BranchRepository extends JpaRepository<Branch, UUID> {
    List<Branch> findByTenantIdOrderByNameAsc(UUID tenantId);
    boolean existsByTenantIdAndCodeIgnoreCase(UUID tenantId, String code);
}
```

- [ ] **Step 4: Update Warehouse entity**

Add `branchId` field to the existing `Warehouse.java`:

```java
@Column(name = "branch_id")
private UUID branchId;
```

- [ ] **Step 5: Commit**

```bash
git add backend/inventory-service/src/main/resources/db/migration/ \
        backend/inventory-service/src/main/java/io/smartpos/inventory/domain/model/Branch.java \
        backend/inventory-service/src/main/java/io/smartpos/inventory/domain/model/Warehouse.java \
        backend/inventory-service/src/main/java/io/smartpos/inventory/domain/repository/BranchRepository.java
git commit -m "feat: add Branch entity and warehouse branchId FK"
```

### Task 11: Add BranchController to inventory-service

**Files:**
- Create: `backend/inventory-service/src/main/java/io/smartpos/inventory/api/BranchController.java`

- [ ] **Step 1: Create BranchController**

```java
package io.smartpos.inventory.api;

import io.smartpos.inventory.domain.model.Branch;
import io.smartpos.inventory.domain.repository.BranchRepository;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/branches")
@RequiredArgsConstructor
public class BranchController {

    private final BranchRepository branchRepo;

    @GetMapping
    public ResponseEntity<List<Branch>> list(@RequestHeader("X-Tenant-ID") UUID tenantId) {
        return ResponseEntity.ok(branchRepo.findByTenantIdOrderByNameAsc(tenantId));
    }

    @GetMapping("/{id}")
    public ResponseEntity<Branch> get(@PathVariable UUID id) {
        return branchRepo.findById(id)
            .map(ResponseEntity::ok)
            .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    @PreAuthorize("hasAuthority('branch.manage')")
    public ResponseEntity<Branch> create(
            @RequestHeader("X-Tenant-ID") UUID tenantId,
            @RequestBody @Valid CreateBranchRequest request) {
        if (branchRepo.existsByTenantIdAndCodeIgnoreCase(tenantId, request.code())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "A branch with this code already exists");
        }
        Branch branch = Branch.builder()
            .name(request.name())
            .code(request.code())
            .address(request.address())
            .city(request.city())
            .phone(request.phone())
            .active(true)
            .tenantId(tenantId)
            .build();
        return ResponseEntity.status(HttpStatus.CREATED).body(branchRepo.save(branch));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('branch.manage')")
    public ResponseEntity<Branch> update(@PathVariable UUID id, @RequestBody @Valid UpdateBranchRequest request) {
        Branch branch = branchRepo.findById(id)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Branch not found"));
        if (request.name() != null) branch.setName(request.name());
        if (request.code() != null) branch.setCode(request.code());
        if (request.address() != null) branch.setAddress(request.address());
        if (request.city() != null) branch.setCity(request.city());
        if (request.phone() != null) branch.setPhone(request.phone());
        return ResponseEntity.ok(branchRepo.save(branch));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('branch.manage')")
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        Branch branch = branchRepo.findById(id)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Branch not found"));
        branch.setActive(false);
        branchRepo.save(branch);
        return ResponseEntity.noContent().build();
    }

    public record CreateBranchRequest(
        @NotBlank String name, @NotBlank String code,
        String address, String city, String phone) {}
    public record UpdateBranchRequest(
        String name, String code, String address, String city, String phone) {}
}
```

- [ ] **Step 2: Commit**

```bash
git add backend/inventory-service/src/main/java/io/smartpos/inventory/api/BranchController.java
git commit -m "feat: add BranchController with CRUD endpoints"
```

### Task 12: Update WarehouseController to accept branchId

**Files:**
- Modify: `backend/inventory-service/src/main/java/io/smartpos/inventory/api/WarehouseController.java`

- [ ] **Step 1: Add branchId to warehouse create/update DTOs**

Read the current `WarehouseController.java` and add `branchId` to the create and update request records:

```java
// Add to CreateWarehouseRequest:
private UUID branchId;

// Add to UpdateWarehouseRequest:
private UUID branchId;

// In the create method, after setting other fields:
warehouse.setBranchId(request.branchId());

// In the update method:
if (request.branchId() != null) warehouse.setBranchId(request.branchId());
```

- [ ] **Step 2: Commit**

```bash
git add backend/inventory-service/src/main/java/io/smartpos/inventory/api/WarehouseController.java
git commit -m "feat: accept branchId in warehouse create/update endpoints"
```

### Task 13: Create frontend Branches API client

**Files:**
- Create: `frontend/src/api/smartpos/branches.ts`

- [ ] **Step 1: Create branches API module**

```typescript
import { api } from './client';
import type { Page } from './types';

export interface Branch {
  id: string;
  name: string;
  code: string;
  address?: string;
  city?: string;
  phone?: string;
  active: boolean;
  tenantId: string;
  createdAt: string;
}

export interface CreateBranchInput {
  name: string;
  code: string;
  address?: string;
  city?: string;
  phone?: string;
}

export interface UpdateBranchInput {
  name?: string;
  code?: string;
  address?: string;
  city?: string;
  phone?: string;
}

export async function listBranches(): Promise<Branch[]> {
  const { data } = await api.get<Branch[]>('/api/v1/branches');
  return data;
}

export async function getBranch(id: string): Promise<Branch> {
  const { data } = await api.get<Branch>(`/api/v1/branches/${id}`);
  return data;
}

export async function createBranch(input: CreateBranchInput): Promise<Branch> {
  const { data } = await api.post<Branch>('/api/v1/branches', input);
  return data;
}

export async function updateBranch(id: string, input: UpdateBranchInput): Promise<Branch> {
  const { data } = await api.put<Branch>(`/api/v1/branches/${id}`, input);
  return data;
}

export async function deleteBranch(id: string): Promise<void> {
  await api.delete(`/api/v1/branches/${id}`);
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/api/smartpos/branches.ts
git commit -m "feat: add branches API client"
```

### Task 14: Create Branches page

**Files:**
- Create: `frontend/src/views/smartpos/settings/BranchesPage.tsx`

- [ ] **Step 1: Create BranchesPage component**

```tsx
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert, Box, Button, Dialog, DialogActions, DialogContent,
  DialogTitle, IconButton, Stack, TextField, Typography,
} from '@mui/material';
import { IconEdit, IconPlus, IconTrash } from '@tabler/icons-react';

import {
  listBranches, createBranch, updateBranch, deleteBranch,
  type Branch, type CreateBranchInput,
} from 'src/api/smartpos/branches';
import DataTable, { type Column } from 'src/components/smartpos/DataTable';
import { PageHeader } from 'src/components/smartpos/PageHeader';
import { brand } from 'src/theme/smartpos/brand';

const EMPTY_FORM: CreateBranchInput = {
  name: '', code: '', address: '', city: '', phone: '',
};

export default function BranchesPage() {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Branch | null>(null);
  const [form, setForm] = useState<CreateBranchInput>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [dialogError, setDialogError] = useState<string | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<Branch | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await listBranches();
      setBranches(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load branches');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setDialogError(null);
    setDialogOpen(true);
  };

  const openEdit = (branch: Branch) => {
    setEditing(branch);
    setForm({
      name: branch.name,
      code: branch.code,
      address: branch.address ?? '',
      city: branch.city ?? '',
      phone: branch.phone ?? '',
    });
    setDialogError(null);
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim() || !form.code.trim()) return;
    setSaving(true);
    setDialogError(null);
    try {
      if (editing) {
        await updateBranch(editing.id, form);
      } else {
        await createBranch(form);
      }
      setDialogOpen(false);
      fetchData();
    } catch (e) {
      setDialogError(e instanceof Error ? e.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteBranch(deleteTarget.id);
      setDeleteTarget(null);
      fetchData();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to delete');
      setDeleteTarget(null);
    }
  };

  const columns: Column<Branch>[] = useMemo(() => [
    { key: 'name', label: 'Name', width: 200, sortable: true },
    { key: 'code', label: 'Code', width: 120, sortable: true },
    {
      key: 'city', label: 'City', width: 150,
      render: (b) => b.city ?? '—',
    },
    {
      key: 'active', label: 'Status', align: 'center', width: 90,
      render: (b) => (
        <Typography
          variant="caption"
          sx={{
            fontWeight: 700, px: 1, py: 0.25, borderRadius: '4px',
            bgcolor: b.active ? brand.success.light : brand.neutral[200],
            color: b.active ? brand.success.dark : brand.neutral[500],
          }}
        >
          {b.active ? 'Active' : 'Inactive'}
        </Typography>
      ),
    },
    {
      key: 'actions', label: '', width: 80, align: 'center',
      render: (b) => (
        <Stack direction="row" spacing={0.5} justifyContent="center">
          <IconButton size="small" onClick={(e) => { e.stopPropagation(); openEdit(b); }}>
            <IconEdit size={15} color={brand.neutral[500]} />
          </IconButton>
          <IconButton size="small" onClick={(e) => { e.stopPropagation(); setDeleteTarget(b); }}>
            <IconTrash size={15} color={brand.error.main} />
          </IconButton>
        </Stack>
      ),
    },
  ], []);

  return (
    <Box>
      <PageHeader
        title="Branches"
        subtitle="Organise warehouses into branches. Branches are optional — everything works without them."
        action={branches.length > 0 ? { label: 'Add Branch', icon: <IconPlus size={18} />, onClick: openCreate, variant: 'primary' } : undefined}
      />

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {branches.length === 0 && !loading ? (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
            No branches configured
          </Typography>
          <Typography variant="body2" sx={{ color: brand.neutral[500], mb: 3 }}>
            Branches are optional. Add one when you want to group multiple warehouses under a single location.
          </Typography>
          <Button variant="contained" startIcon={<IconPlus size={16} />} onClick={openCreate}>
            Add your first branch
          </Button>
        </Box>
      ) : (
        <DataTable
          columns={columns}
          rows={branches}
          loading={loading}
          totalPages={1}
          totalElements={branches.length}
        />
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editing ? 'Edit Branch' : 'Add Branch'}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            {dialogError && <Alert severity="error" onClose={() => setDialogError(null)}>{dialogError}</Alert>}
            <TextField label="Name" required fullWidth value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <TextField label="Code" required fullWidth value={form.code}
              onChange={(e) => setForm({ ...form, code: e.target.value })}
              helperText="Short code, e.g. MALL, DOWNTOWN" />
            <TextField label="Address" fullWidth value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })} />
            <TextField label="City" fullWidth value={form.city}
              onChange={(e) => setForm({ ...form, city: e.target.value })} />
            <TextField label="Phone" fullWidth value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving…' : editing ? 'Save Changes' : 'Create Branch'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)}>
        <DialogTitle>Delete Branch</DialogTitle>
        <DialogContent>
          <Typography>
            Delete <strong>{deleteTarget?.name}</strong>? This cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteTarget(null)}>Cancel</Button>
          <Button variant="contained" color="error" onClick={handleDelete}>Delete</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/views/smartpos/settings/BranchesPage.tsx
git commit -m "feat: add BranchesPage with CRUD dialog"
```

### Task 15: Create frontend Billing API client

**Files:**
- Create: `frontend/src/api/smartpos/billing.ts`

- [ ] **Step 1: Create billing API module**

```typescript
import { api } from './client';

export interface PlanDefinition {
  id: string;
  code: string;
  label: string;
  description?: string;
  monthlyPriceTzs: number;
  annualPriceTzs?: number;
  maxUsers: number;
  maxStores: number;
  maxProducts: number;
  features: string; // JSON string
  isPublic: boolean;
  sortOrder: number;
}

export interface Subscription {
  id: string;
  tenantId: string;
  planCode: string;
  status: 'ACTIVE' | 'PAST_DUE' | 'CANCELLED';
  billingCycle: 'MONTHLY' | 'ANNUAL';
  currentPeriodStart: string;
  currentPeriodEnd: string;
  cancelledAt?: string;
}

export interface Invoice {
  id: string;
  tenantId: string;
  subscriptionId?: string;
  invoiceNumber: string;
  amountTzs: number;
  status: 'PENDING' | 'PAID' | 'OVERDUE' | 'CANCELLED';
  paymentMethod?: string;
  dueDate: string;
  paidAt?: string;
  createdAt: string;
}

export async function listPlans(): Promise<PlanDefinition[]> {
  const { data } = await api.get<PlanDefinition[]>('/api/v1/billing/plans');
  return data;
}

export async function listAllPlans(): Promise<PlanDefinition[]> {
  const { data } = await api.get<PlanDefinition[]>('/api/v1/billing/plans/admin');
  return data;
}

export async function updatePlan(code: string, update: Partial<PlanDefinition>): Promise<PlanDefinition> {
  const { data } = await api.put<PlanDefinition>(`/api/v1/billing/plans/admin/${code}`, update);
  return data;
}

export async function getSubscription(tenantId: string): Promise<Subscription | null> {
  try {
    const { data } = await api.get<Subscription>(`/api/v1/billing/subscriptions/tenant/${tenantId}`);
    return data;
  } catch {
    return null;
  }
}

export async function createSubscription(body: Partial<Subscription>): Promise<Subscription> {
  const { data } = await api.post<Subscription>('/api/v1/billing/subscriptions/admin', body);
  return data;
}

export async function updateSubscription(id: string, body: Partial<Subscription>): Promise<Subscription> {
  const { data } = await api.patch<Subscription>(`/api/v1/billing/subscriptions/admin/${id}`, body);
  return data;
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/api/smartpos/billing.ts
git commit -m "feat: add billing API client"
```

### Task 16: Update frontend Tenant type and API

**Files:**
- Modify: `frontend/src/api/smartpos/auth.ts`

- [ ] **Step 1: Update Tenant interface**

Add new fields to the existing `Tenant` interface and add lifecycle API functions:

```typescript
// Update the Tenant interface — add to existing:
export interface Tenant {
  id: string;
  name: string;
  slug: string;
  status: 'TRIAL' | 'TRIAL_EXPIRED' | 'ACTIVE' | 'PAST_DUE' | 'SUSPENDED' | 'CLOSED';
  billingPlan: 'FREE' | 'STARTER' | 'BUSINESS' | 'PROFESSIONAL' | 'ENTERPRISE';
  maxUsers: number;
  maxStores: number;
  settings: string;
  trialEndsAt?: string;
  statusChangedAt?: string;
  statusReason?: string;
  createdAt: string;
  updatedAt: string;
}

// Add lifecycle API functions:
export async function suspendTenant(id: string, reason: string): Promise<Tenant> {
  const { data } = await api.post<Tenant>(`/api/v1/tenants/${id}/suspend`, { reason });
  return data;
}

export async function reactivateTenant(id: string): Promise<Tenant> {
  const { data } = await api.post<Tenant>(`/api/v1/tenants/${id}/reactivate`);
  return data;
}

export async function closeTenant(id: string, reason: string): Promise<Tenant> {
  const { data } = await api.post<Tenant>(`/api/v1/tenants/${id}/close`, { reason });
  return data;
}

export async function listAllTenants(): Promise<Tenant[]> {
  const { data } = await api.get<Tenant[]>('/api/v1/tenants/admin/all');
  return data;
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/api/smartpos/auth.ts
git commit -m "feat: update Tenant type and add lifecycle API functions"
```

### Task 17: Update sidebar — activate Branches and Billing, move Users & Roles

**Files:**
- Modify: `frontend/src/layouts/full/vertical/sidebar/SmartPosMenuItems.ts`

- [ ] **Step 1: Update sidebar items**

In the Administration subheader section, make these changes:

```typescript
// ── Administration ──────────────────────────────────────────────────
{ subheader: 'Administration' },
{ id: uid(), title: t('smartpos:nav.preferences'), icon: IconSettings, href: '/smartpos/settings' },
{ id: uid(), title: t('smartpos:nav.users_roles'), icon: IconUserShield, href: '/smartpos/settings/users' },  // moved from People
{ id: uid(), title: t('smartpos:nav.tenants'), icon: IconBuilding, href: '/smartpos/settings/tenants' },
{ id: uid(), title: 'Branches', icon: IconBuilding, href: '/smartpos/admin/branches' },  // activated — was soon
{ id: uid(), title: t('smartpos:nav.pos_terminals'), icon: IconDeviceDesktop, href: '/smartpos/pos/terminals' },
{ id: uid(), title: t('smartpos:nav.receipt_settings'), icon: IconReceipt, href: '/smartpos/settings/receipt' },
{ id: uid(), title: 'Printer Settings', icon: IconPrinter, href: '/smartpos/settings/printers' },
{ id: uid(), title: 'Tax & Pricing', icon: IconPercentage, href: '/smartpos/settings/tax-pricing' },
{ id: uid(), title: t('smartpos:nav.languages_admin'), icon: IconLanguage, href: '/smartpos/settings/i18n' },
{ id: uid(), title: t('smartpos:nav.localization'), icon: IconWorld, href: '/smartpos/settings/locale' },
{ id: uid(), title: 'Notifications', icon: IconBellRinging, href: '/smartpos/settings/notifications' },
{ id: uid(), title: 'Subscription & Billing', icon: IconCreditCard, href: '/smartpos/admin/billing' },  // activated — was soon
```

Also, remove the "Users & Roles" entry from the People subheader (if it exists there). It should now only appear in Administration.

- [ ] **Step 2: Commit**

```bash
git add frontend/src/layouts/full/vertical/sidebar/SmartPosMenuItems.ts
git commit -m "feat: activate Branches and Billing in sidebar, move Users & Roles to Administration"
```

### Task 18: Add frontend routes for Branches and Billing

**Files:**
- Modify: `frontend/src/routes/Router.tsx`

- [ ] **Step 1: Add new routes**

Add the new routes under the smartpos settings path:

```tsx
// Add these routes inside the settings children array:
{ path: 'admin/branches', element: <SmartPosBranches /> },
{ path: 'admin/billing', element: <SmartPosBilling /> },
{ path: 'admin/billing/plans', element: <SmartPosBillingPlans /> },
```

Add the corresponding imports at the top of the file:

```tsx
import BranchesPage from 'src/views/smartpos/settings/BranchesPage';
import BillingPage from 'src/views/smartpos/settings/BillingPage';
import BillingPlansPage from 'src/views/smartpos/settings/BillingPlansPage';

// Lazy-load aliases:
const SmartPosBranches = BranchesPage;
const SmartPosBilling = BillingPage;
const SmartPosBillingPlans = BillingPlansPage;
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/routes/Router.tsx
git commit -m "feat: add routes for Branches, Billing dashboard, and Billing Plans pages"
```

### Task 19: Create Billing dashboard page (placeholder)

**Files:**
- Create: `frontend/src/views/smartpos/settings/BillingPage.tsx`

- [ ] **Step 1: Create BillingPage component**

```tsx
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import {
  Alert, Box, Button, Card, CardContent, Chip, CircularProgress,
  Grid2 as Grid, Stack, Typography,
} from '@mui/material';
import { IconArrowRight, IconCreditCard, IconReceipt } from '@tabler/icons-react';

import { listPlans, type PlanDefinition } from 'src/api/smartpos/billing';
import { PageHeader } from 'src/components/smartpos/PageHeader';
import { brand } from 'src/theme/smartpos/brand';

export default function BillingPage() {
  const navigate = useNavigate();
  const [plans, setPlans] = useState<PlanDefinition[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listPlans()
      .then(setPlans)
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <Box>
      <PageHeader
        title="Subscription & Billing"
        subtitle="Manage plans, subscriptions, and payment methods"
      />

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress size={32} />
        </Box>
      ) : (
        <Grid container spacing={3}>
          {/* Plan cards */}
          <Grid size={{ xs: 12 }}>
            <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
              Available Plans
            </Typography>
          </Grid>
          {plans.map((plan) => (
            <Grid key={plan.id} size={{ xs: 12, sm: 6, md: 3 }}>
              <Card
                sx={{
                  border: plan.code === 'BUSINESS' ? `1.5px solid ${brand.primary.main}` : `1px solid ${brand.neutral[200]}`,
                  borderRadius: '12px',
                  position: 'relative',
                }}
              >
                {plan.code === 'BUSINESS' && (
                  <Chip
                    label="Most popular"
                    size="small"
                    sx={{
                      position: 'absolute', top: 12, right: 12,
                      bgcolor: brand.primary.light, color: brand.primary.dark,
                      fontWeight: 700, fontSize: '0.6875rem',
                    }}
                  />
                )}
                <CardContent>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                    {plan.label}
                  </Typography>
                  <Typography variant="h5" sx={{ fontWeight: 800, mt: 1 }}>
                    TZS {plan.monthlyPriceTzs?.toLocaleString() ?? '—'}
                  </Typography>
                  <Typography variant="caption" sx={{ color: brand.neutral[500] }}>
                    /month
                  </Typography>
                  <Typography variant="body2" sx={{ mt: 2, color: brand.neutral[600] }}>
                    {plan.description}
                  </Typography>
                  <Stack spacing={0.5} sx={{ mt: 2 }}>
                    <Typography variant="caption">
                      {plan.maxUsers === 2147483647 ? 'Unlimited' : plan.maxUsers} users
                    </Typography>
                    <Typography variant="caption">
                      {plan.maxStores === 2147483647 ? 'Unlimited' : plan.maxStores} stores
                    </Typography>
                    <Typography variant="caption">
                      {plan.maxProducts === 2147483647 ? 'Unlimited' : plan.maxProducts.toLocaleString()} products
                    </Typography>
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
          ))}

          {/* Quick links */}
          <Grid size={{ xs: 12 }}>
            <Stack direction="row" spacing={2} sx={{ mt: 2 }}>
              <Button
                variant="outlined"
                startIcon={<IconReceipt size={16} />}
                endIcon={<IconArrowRight size={14} />}
                onClick={() => navigate('/smartpos/admin/billing/plans')}
              >
                Manage Plans
              </Button>
              <Button
                variant="outlined"
                startIcon={<IconCreditCard size={16} />}
                endIcon={<IconArrowRight size={14} />}
              >
                View Invoices
              </Button>
            </Stack>
          </Grid>
        </Grid>
      )}
    </Box>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/views/smartpos/settings/BillingPage.tsx
git commit -m "feat: add BillingPage dashboard with plan cards"
```

### Task 20: Create Billing Plans management page (placeholder)

**Files:**
- Create: `frontend/src/views/smartpos/settings/BillingPlansPage.tsx`

- [ ] **Step 1: Create BillingPlansPage component**

```tsx
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert, Box, Chip, Typography,
} from '@mui/material';

import { listAllPlans, type PlanDefinition } from 'src/api/smartpos/billing';
import DataTable, { type Column } from 'src/components/smartpos/DataTable';
import { PageHeader } from 'src/components/smartpos/PageHeader';
import { brand } from 'src/theme/smartpos/brand';

const FEATURE_LABELS: Record<string, string> = {
  accounting: 'Accounting',
  purchases: 'Purchases',
  reports: 'Reports',
  hrm: 'HR & Payroll',
  api: 'API Access',
  multi_currency: 'Multi-currency',
  multi_company: 'Multi-company',
  white_label: 'White-label',
  support: 'Support',
};

export default function BillingPlansPage() {
  const [plans, setPlans] = useState<PlanDefinition[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      setPlans(await listAllPlans());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const columns: Column<PlanDefinition>[] = useMemo(() => [
    {
      key: 'label', label: 'Plan', width: 150, sortable: true,
      render: (p) => (
        <Typography variant="body2" sx={{ fontWeight: 700 }}>
          {p.label}
          {p.code === 'BUSINESS' && (
            <Chip label="Popular" size="small" sx={{ ml: 1, height: 20, fontSize: '0.625rem', fontWeight: 700, bgcolor: brand.primary.light, color: brand.primary.dark }} />
          )}
        </Typography>
      ),
    },
    {
      key: 'price', label: 'Monthly', align: 'right', width: 120,
      render: (p) => p.monthlyPriceTzs > 0
        ? `TZS ${p.monthlyPriceTzs.toLocaleString()}`
        : 'Free',
    },
    {
      key: 'users', label: 'Users', align: 'right', width: 80,
      render: (p) => p.maxUsers === 2147483647 ? '∞' : String(p.maxUsers),
    },
    {
      key: 'stores', label: 'Stores', align: 'right', width: 80,
      render: (p) => p.maxStores === 2147483647 ? '∞' : String(p.maxStores),
    },
    {
      key: 'products', label: 'Products', align: 'right', width: 100,
      render: (p) => p.maxProducts === 2147483647 ? '∞' : p.maxProducts.toLocaleString(),
    },
    {
      key: 'features', label: 'Key Features', width: 300,
      render: (p) => {
        const features = JSON.parse(p.features || '{}');
        return (
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
            {Object.entries(FEATURE_LABELS).map(([key, label]) => {
              const val = features[key];
              if (val === false) return null;
              const tone = val === true || val === 'full' || val === 'full_export' || val === 'full_custom'
                ? 'success' : 'neutral';
              return (
                <Chip
                  key={key}
                  label={typeof val === 'string' ? `${label}: ${val}` : label}
                  size="small"
                  sx={{ height: 20, fontSize: '0.625rem', fontWeight: 600 }}
                />
              );
            })}
          </Box>
        );
      },
    },
  ], []);

  return (
    <Box>
      <PageHeader
        title="Plans"
        subtitle="Define pricing tiers, limits, and feature gating"
      />

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>}

      <DataTable
        columns={columns}
        rows={plans}
        loading={loading}
        totalPages={1}
        totalElements={plans.length}
      />
    </Box>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/views/smartpos/settings/BillingPlansPage.tsx
git commit -m "feat: add BillingPlansPage with feature matrix table"
```

### Task 21: Update TenantsSettings for lifecycle actions and new plan names

**Files:**
- Modify: `frontend/src/views/smartpos/settings/SettingsPlaceholder.tsx` (lines ~1645-1763)

- [ ] **Step 1: Update planMeta and add lifecycle action buttons**

Update `planMeta` in the TenantsSettings component:

```typescript
const planMeta: Record<string, { label: string; users: number; stores: number }> = {
  FREE: { label: 'Free', users: 1, stores: 1 },
  STARTER: { label: 'Starter', users: 5, stores: 1 },
  BUSINESS: { label: 'Business', users: 20, stores: 5 },
  PROFESSIONAL: { label: 'Professional', users: 100, stores: 25 },
  ENTERPRISE: { label: 'Enterprise', users: -1, stores: -1 },
};
```

Add lifecycle action buttons below the status badge in the tenant detail view. Import the new API functions:

```tsx
import {
  suspendTenant, reactivateTenant, closeTenant,
  type Tenant,
} from 'src/api/smartpos/auth';

// Add state:
const [lifecycleConfirm, setLifecycleConfirm] = useState<{
  action: 'suspend' | 'reactivate' | 'close';
  reason?: string;
} | null>(null);
const [lifecycleLoading, setLifecycleLoading] = useState(false);

// Add handler:
const handleLifecycle = async () => {
  if (!lifecycleConfirm || !tenant) return;
  setLifecycleLoading(true);
  try {
    let updated: Tenant;
    switch (lifecycleConfirm.action) {
      case 'suspend':
        updated = await suspendTenant(tenant.id, lifecycleConfirm.reason || 'Admin action');
        break;
      case 'reactivate':
        updated = await reactivateTenant(tenant.id);
        break;
      case 'close':
        updated = await closeTenant(tenant.id, lifecycleConfirm.reason || 'Admin action');
        break;
    }
    setTenant(updated);
    setLifecycleConfirm(null);
  } catch (e) {
    setError(e instanceof Error ? e.message : 'Action failed');
  } finally {
    setLifecycleLoading(false);
  }
};
```

Add action buttons below the status badge in the JSX:

```tsx
<Stack direction="row" spacing={1} sx={{ mt: 2 }}>
  {tenant.status === 'ACTIVE' || tenant.status === 'TRIAL' || tenant.status === 'PAST_DUE' ? (
    <Button
      size="small"
      color="warning"
      variant="outlined"
      onClick={() => setLifecycleConfirm({ action: 'suspend' })}
    >
      Suspend
    </Button>
  ) : null}
  {tenant.status === 'SUSPENDED' || tenant.status === 'TRIAL_EXPIRED' ? (
    <Button
      size="small"
      color="success"
      variant="outlined"
      onClick={() => setLifecycleConfirm({ action: 'reactivate' })}
    >
      Reactivate
    </Button>
  ) : null}
  {tenant.status !== 'CLOSED' ? (
    <Button
      size="small"
      color="error"
      variant="outlined"
      onClick={() => setLifecycleConfirm({ action: 'close' })}
    >
      Close
    </Button>
  ) : null}
</Stack>
```

Add a confirmation dialog for lifecycle actions:

```tsx
<Dialog open={!!lifecycleConfirm} onClose={() => setLifecycleConfirm(null)}>
  <DialogTitle>
    {lifecycleConfirm?.action === 'suspend' ? 'Suspend Tenant' :
     lifecycleConfirm?.action === 'reactivate' ? 'Reactivate Tenant' :
     'Close Tenant'}
  </DialogTitle>
  <DialogContent>
    <Typography sx={{ mb: 2 }}>
      {lifecycleConfirm?.action === 'suspend'
        ? 'This will block all users from accessing the workspace. Data is preserved.'
        : lifecycleConfirm?.action === 'reactivate'
        ? 'This will restore access for all users.'
        : 'This permanently closes the workspace. Data will be deleted after 90 days.'}
    </Typography>
    {(lifecycleConfirm?.action === 'suspend' || lifecycleConfirm?.action === 'close') && (
      <TextField
        label="Reason"
        fullWidth
        multiline
        rows={2}
        value={lifecycleConfirm?.reason ?? ''}
        onChange={(e) => setLifecycleConfirm({ ...lifecycleConfirm!, reason: e.target.value })}
      />
    )}
  </DialogContent>
  <DialogActions>
    <Button onClick={() => setLifecycleConfirm(null)}>Cancel</Button>
    <Button
      variant="contained"
      color={lifecycleConfirm?.action === 'close' ? 'error' : 'primary'}
      onClick={handleLifecycle}
      disabled={lifecycleLoading}
    >
      {lifecycleLoading ? 'Processing…' : 'Confirm'}
    </Button>
  </DialogActions>
</Dialog>
```

- [ ] **Step 2: Rebuild and verify**

```bash
cd frontend && npx tsc --noEmit 2>&1 | head -20
```

Fix any TypeScript errors before committing.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/views/smartpos/settings/SettingsPlaceholder.tsx
git commit -m "feat: update tenant plan names and add lifecycle action buttons"
```

### Task 22: Add i18n keys for new sidebar items

**Files:**
- Modify: `frontend/src/i18n/smartpos/en.json`
- Modify: `frontend/src/i18n/smartpos/sw.json`

- [ ] **Step 1: Add English keys**

Add missing i18n keys to `en.json`:

```json
{
  "nav": {
    "users_roles": "Users & Roles",
    "branches": "Branches",
    "subscription_billing": "Subscription & Billing"
  }
}
```

Add similar Swahili keys to `sw.json`:

```json
{
  "nav": {
    "users_roles": "Watumiaji & Majukumu",
    "branches": "Matawi",
    "subscription_billing": "Usajili & Malipo"
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/i18n/smartpos/en.json frontend/src/i18n/smartpos/sw.json
git commit -m "feat: add i18n keys for branches, billing, and users & roles"
```

### Task 23: Add missing permission authorities to auth-service and gateway

**Files:**
- Modify: `backend/auth-service/src/main/java/io/smartpos/auth/infrastructure/config/AdminBootstrap.java`
- Modify: `backend/gateway/src/main/java/io/smartpos/gateway/SecurityConfig.java`

- [ ] **Step 1: Add new authorities to admin bootstrap seed**

Add new authorities to the admin user on bootstrap:

```java
// In AdminBootstrap.java, add to the admin authorities set:
private static final Set<String> ADMIN_AUTHORITIES = Set.of(
    "admin",
    "branch.view", "branch.manage",
    "billing.view", "billing.manage",
    "tenant.suspend",
    "audit.view", "session.manage", "retention.manage",
    "error_log.view", "api_key.manage"
);
```

- [ ] **Step 2: Add new public paths to gateway if needed**

Branch list endpoint should be accessible to authenticated users. The billing plans endpoint is public. Verify the gateway allows authenticated traffic to `/api/v1/branches/**` and `/api/v1/billing/**` — these are already covered by the route config from Task 9. No SecurityConfig changes needed since `anyExchange().authenticated()` already covers them.

- [ ] **Step 3: Commit**

```bash
git add backend/auth-service/src/main/java/io/smartpos/auth/infrastructure/config/AdminBootstrap.java
git commit -m "feat: add admin authorities to bootstrap seed"
```

---

## Post-Implementation Verification

After all tasks are complete, verify:

1. **Build backend services:**
   ```bash
   cd backend/auth-service && mvn compile
   cd backend/inventory-service && mvn compile
   cd backend/billing-service && mvn compile
   cd backend/gateway && mvn compile
   ```

2. **TypeScript check:**
   ```bash
   cd frontend && npx tsc --noEmit
   ```

3. **Start services and test:**
   - `POST /api/v1/branches` — create a branch
   - `POST /api/v1/tenants/{id}/suspend` — suspend a tenant
   - `GET /api/v1/billing/plans` — list public plans
   - Navigate to `/smartpos/admin/branches` — page renders
   - Navigate to `/smartpos/admin/billing` — page renders
   - `/smartpos/admin/billing/plans` — plan matrix renders
