# Users, Roles & Tenant Admin — Phase 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Introduce SUPER_ADMIN/TENANT_ADMIN/MANAGER roles, add tenant disable/delete, and fix all `TenantContext.require()` 500s across all services.

**Architecture:** Database-first: seed new system roles via Flyway migrations, reassign existing tenant users from ADMIN to TENANT_ADMIN, add DISABLED/DELETED statuses to TenantStatus enum, add lifecycle endpoints with @PreAuthorize guards, then systematically fix every service's `TenantContext.require()` read operations and add `TenantNotInContextException` handlers where missing.

**Tech Stack:** Java 21, Spring Boot 3.3.4, Spring Data JPA, Flyway, PostgreSQL 16

**Audit of current state (pre-plan):**

| Service | Has GlobalExceptionHandler? | Has TenantContext.require()? | Needs fixing? |
|---|---|---|---|
| auth-service | Yes | No (uses own JWT checks) | No |
| user-service | Yes (fixed today) | Yes (fixed today) | No |
| inventory-service | Yes (fixed today) | Yes (fixed today) | No |
| product-service | Yes | Yes (3 read ops) | Yes |
| sales-service | Yes | Yes (5 read ops) | Yes |
| payment-service | Yes | Yes (4 read ops) | Yes |
| report-service | Yes | Yes (5 read ops) | Yes |
| commerce-service | Yes | Yes (5 read ops) | Yes |
| billing-service | No | No | No |
| notification-service | **No** | Yes (4 read ops) | Yes |
| hrm-service | **No** | Yes (5+ read ops) | Yes |
| crm-service | **No** | No | Add EH only |
| document-service | **No** | Yes (4 read ops) | Yes |
| integration-service | **No** | Yes (4 read ops) | Yes |
| ai-service | **No** | Yes (5 read ops) | Yes |
| audit-service | **No** | Yes (5 read ops) | Yes |

---

### Task 1: Database — New System Roles

**Files:**
- Create: `backend/user-service/src/main/resources/db/migration/V8__new_system_roles.sql`
- Read: `backend/user-service/src/main/resources/db/migration/V1__init.sql` (lines 107-121 for reference)

- [ ] **Step 1: Write the migration**

```sql
-- V8__new_system_roles.sql
-- Rename ADMIN → SUPER_ADMIN and add TENANT_ADMIN + MANAGER system roles.
--
-- SUPER_ADMIN retains all existing permissions (83+).
-- TENANT_ADMIN gets ~50 business permissions (no platform perms).
-- MANAGER gets ~35 operational permissions.
-- CASHIER is unchanged.

-- 1. Rename existing ADMIN → SUPER_ADMIN
UPDATE roles SET name = 'SUPER_ADMIN', label = 'Super Admin',
    description = 'Platform owner with full system access'
WHERE id = '00000000-0000-0000-0000-000000000001';

-- 2. Create TENANT_ADMIN role with scoped permissions
INSERT INTO roles (id, name, label, description, tenant_id, is_system, created_at, updated_at)
VALUES ('00000000-0000-0000-0000-000000000003', 'TENANT_ADMIN', 'Tenant Admin',
        'Full control within own tenant — no platform access',
        NULL, true, now(), now());

INSERT INTO role_permissions (role_id, permission_id)
SELECT '00000000-0000-0000-0000-000000000003', id FROM permissions WHERE name IN (
    'user.view', 'user.create', 'user.update', 'user.delete',
    'role.view', 'role.manage',
    'product.view', 'product.create', 'product.update', 'product.delete', 'category.manage',
    'customer.manage', 'supplier.manage', 'warehouse.manage',
    'stock.view', 'stock.transfer', 'stock.adjust', 'stock.count',
    'sale.view', 'sale.create', 'sale.update', 'sale.delete', 'sale.return',
    'pos.use', 'pos.terminal.view', 'pos.terminal.manage',
    'quotation.manage',
    'purchase.view', 'purchase.create', 'purchase.update', 'purchase.delete', 'purchase.return',
    'payment.view', 'payment.record', 'payment.refund',
    'account.manage', 'account.view', 'expense.manage', 'deposit.manage',
    'journal.view', 'journal.create', 'journal.update', 'journal.post', 'journal.delete',
    'report.sales', 'report.inventory', 'report.financial', 'report.export', 'report.financial.view',
    'settings.manage', 'settings.i18n',
    'notification.view', 'notification.send', 'notification.template.write',
    'hrm.view', 'hrm.manage', 'hrm.attendance.write', 'hrm.leave.request', 'hrm.leave.approve',
    'hrm.payroll.view', 'hrm.payroll.manage',
    'recurring.view', 'recurring.manage',
    'ai.insight', 'ai.chat',
    'integration.view', 'integration.zatca', 'integration.woo', 'integration.quickbooks',
    'coupon.manage', 'promotion.manage',
    'pos.checkout', 'internal.notification.send', 'internal.serial.write'
);

-- 3. Create MANAGER role
INSERT INTO roles (id, name, label, description, tenant_id, is_system, created_at, updated_at)
VALUES ('00000000-0000-0000-0000-000000000004', 'MANAGER', 'Manager',
        'Day-to-day operations without user/role management',
        NULL, true, now(), now());

INSERT INTO role_permissions (role_id, permission_id)
SELECT '00000000-0000-0000-0000-000000000004', id FROM permissions WHERE name IN (
    'user.view',
    'product.view', 'product.create', 'product.update', 'product.delete', 'category.manage',
    'customer.manage', 'supplier.manage',
    'stock.view', 'stock.transfer', 'stock.adjust', 'stock.count',
    'sale.view', 'sale.create', 'sale.update', 'sale.delete', 'sale.return',
    'pos.use', 'pos.terminal.view',
    'purchase.view', 'purchase.create', 'purchase.update', 'purchase.delete', 'purchase.return',
    'payment.view', 'payment.record',
    'report.sales', 'report.inventory',
    'hrm.view', 'hrm.attendance.write', 'hrm.leave.request',
    'recurring.view', 'ai.insight', 'ai.chat'
);
```

- [ ] **Step 2: Test migration locally**

```bash
cd backend/user-service
mvn flyway:migrate -Dflyway.url=jdbc:postgresql://localhost:5434/user_db -Dflyway.user=smartpos -Dflyway.password=smartpos
```

Verify:
```sql
SELECT id, name, label FROM roles WHERE is_system = true;
-- Should show: SUPER_ADMIN (000...001), CASHIER (000...002), TENANT_ADMIN (000...003), MANAGER (000...004)
```

- [ ] **Step 3: Commit**

```bash
git add backend/user-service/src/main/resources/db/migration/V8__new_system_roles.sql
git commit -m "feat: add TENANT_ADMIN and MANAGER system roles, rename ADMIN to SUPER_ADMIN"
```

---

### Task 2: Database — Reassign Existing Tenant Admins

**Files:**
- Create: `backend/user-service/src/main/resources/db/migration/V9__reassign_tenant_admins.sql`

- [ ] **Step 1: Write the reassignment migration**

```sql
-- V9__reassign_tenant_admins.sql
-- Reassign the first user in each tenant from SUPER_ADMIN (old ADMIN) to TENANT_ADMIN.
-- The SUPER_ADMIN role (000...001) should only belong to the platform owner (user with null tenantId).

-- For each tenant, find the earliest-created user and change their SUPER_ADMIN role to TENANT_ADMIN.
-- Users with null tenantId (platform admin) keep SUPER_ADMIN.

WITH first_users AS (
    SELECT DISTINCT ON (tenant_id) id AS user_id, tenant_id
    FROM user_profiles
    WHERE tenant_id IS NOT NULL
    ORDER BY tenant_id, created_at ASC
)
UPDATE user_roles ur
SET role_id = '00000000-0000-0000-0000-000000000003' -- TENANT_ADMIN
FROM first_users fu
WHERE ur.user_id = fu.user_id
  AND ur.role_id = '00000000-0000-0000-0000-000000000001'; -- old ADMIN / SUPER_ADMIN
```

- [ ] **Step 2: Verify migration**

Apply and check that the platform admin (null tenantId) still has SUPER_ADMIN, and tenant first users have TENANT_ADMIN.

- [ ] **Step 3: Commit**

```bash
git add backend/user-service/src/main/resources/db/migration/V9__reassign_tenant_admins.sql
git commit -m "feat: reassign first tenant users from SUPER_ADMIN to TENANT_ADMIN"
```

---

### Task 3: Auth — Add DISABLED and DELETED to TenantStatus

**Files:**
- Modify: `backend/auth-service/src/main/java/io/smartpos/auth/domain/model/TenantStatus.java`
- Modify: `backend/auth-service/src/main/java/io/smartpos/auth/domain/model/Tenant.java` (add status helper methods)
- Modify: `backend/auth-service/src/main/java/io/smartpos/auth/application/TenantService.java` (add disable + softDelete methods)
- Modify: `backend/auth-service/src/main/java/io/smartpos/auth/api/TenantController.java` (add endpoints)

- [ ] **Step 1: Add statuses to TenantStatus enum**

Read `backend/auth-service/src/main/java/io/smartpos/auth/domain/model/TenantStatus.java` first, then add:

```java
// After CLOSED line:
DISABLED,   // admin-initiated deactivation (not payment-related), reversible
DELETED     // soft-deleted, data retained 30 days before hard deletion
```

- [ ] **Step 2: Add status helpers to Tenant.java**

Read the file first, then add:

```java
public boolean isLoginBlocked() {
    return status == TenantStatus.SUSPENDED
        || status == TenantStatus.CLOSED
        || status == TenantStatus.DISABLED
        || status == TenantStatus.DELETED;
}

public void disable() {
    this.status = TenantStatus.DISABLED;
    this.statusChangedAt = Instant.now();
}

public void softDelete() {
    this.status = TenantStatus.DELETED;
    this.statusChangedAt = Instant.now();
}
```

- [ ] **Step 3: Add disable() and softDelete() to TenantService**

Read the service first, then add these methods:

```java
public Tenant disable(UUID id, String reason) {
    Tenant t = getById(id);
    t.disable();
    t.setStatusReason(reason);
    t = tenantRepository.save(t);
    // publish audit event
    return t;
}

public Tenant softDelete(UUID id, String reason) {
    Tenant t = getById(id);
    t.softDelete();
    t.setStatusReason(reason);
    t = tenantRepository.save(t);
    // publish audit event
    return t;
}
```

- [ ] **Step 4: Add endpoints to TenantController**

Read the controller first, then add:

```java
@PostMapping("/{id}/disable")
@PreAuthorize("hasAuthority('tenant.suspend')")
public ResponseEntity<Tenant> disable(
        @PathVariable UUID id,
        @RequestBody @Valid DisableRequest request) {
    return ResponseEntity.ok(tenantService.disable(id, request.reason()));
}

@DeleteMapping("/{id}")
@PreAuthorize("hasAuthority('admin')")
public ResponseEntity<Void> deleteTenant(
        @PathVariable UUID id,
        @RequestBody @Valid DeleteRequest request) {
    tenantService.softDelete(id, request.reason());
    return ResponseEntity.noContent().build();
}

// Add these DTOs:
public record DisableRequest(@NotBlank String reason) {}
public record DeleteRequest(@NotBlank String reason) {}
```

- [ ] **Step 5: Build auth-service and verify compilation**

```bash
cd backend && mvn -pl auth-service -am compile
```

- [ ] **Step 6: Commit**

```bash
git add backend/auth-service/
git commit -m "feat: add DISABLED/DELETED tenant statuses and lifecycle endpoints"
```

---

### Task 4: User-Service — Change First-User Default Role

**Files:**
- Modify: `backend/user-service/src/main/java/io/smartpos/user/application/UserProfileService.java:95-101`

- [ ] **Step 1: Change first-user role from ADMIN to TENANT_ADMIN**

Read the file first to confirm line numbers, then change:

```java
// Before (line ~96):
// String roleName = isFirstInTenant ? "ADMIN" : "CASHIER";

// After:
String roleName = isFirstInTenant ? "TENANT_ADMIN" : "CASHIER";
```

- [ ] **Step 2: Build and verify**

```bash
cd backend && mvn -pl user-service -am compile
```

- [ ] **Step 3: Commit**

```bash
git add backend/user-service/src/main/java/io/smartpos/user/application/UserProfileService.java
git commit -m "feat: assign TENANT_ADMIN role to first user in new tenant"
```

---

### Task 5: Product-Service — Fix TenantContext + Add Exception Handler

**Files:**
- Modify: `backend/product-service/src/main/java/io/smartpos/product/api/GlobalExceptionHandler.java` (add TenantNotInContextException handler)
- Modify: `backend/product-service/src/main/java/io/smartpos/product/application/SupplierService.java:35` (fix read)
- Modify: `backend/product-service/src/main/java/io/smartpos/product/application/CustomerGroupService.java:31,38` (fix reads)

- [ ] **Step 1: Add exception handler**

```java
// Add import to GlobalExceptionHandler.java:
import io.smartpos.common.context.TenantNotInContextException;

// Add before the generic Exception handler:
@ExceptionHandler(TenantNotInContextException.class)
public ProblemDetail tenantNotInContext(TenantNotInContextException ex) {
    ProblemDetail pd = ProblemDetail.forStatusAndDetail(HttpStatus.BAD_REQUEST, ex.getMessage());
    pd.setTitle("Bad request");
    return pd;
}
```

- [ ] **Step 2: Fix SupplierService.list() read operation**

Read the file, then change line 35 from:
```java
return repo.search(q, active, TenantContext.require(), pageable).map(SupplierDto::from);
```
to:
```java
UUID tenantId = TenantContext.get().orElse(null);
return repo.search(q, active, tenantId, pageable).map(SupplierDto::from);
```

Check that the repository's `search` query handles null tenantId. If it uses `WHERE supplier.tenantId = :tenantId`, add `:tenantId IS NULL OR` prefix.

- [ ] **Step 3: Fix CustomerGroupService read operations**

Change lines 31 and 38 from `TenantContext.require()` to `TenantContext.get().orElse(null)`. For the list method, pass null to skip tenant filter. For write operations (line 57), keep `require()`.

- [ ] **Step 4: Build and verify**

```bash
cd backend && mvn -pl product-service -am compile
```

- [ ] **Step 5: Commit**

```bash
git add backend/product-service/
git commit -m "fix: add TenantNotInContextException handler and fix read operations in product-service"
```

---

### Task 6: Sales-Service — Fix TenantContext + Add Exception Handler

**Files:**
- Modify: `backend/sales-service/src/main/java/io/smartpos/sales/api/GlobalExceptionHandler.java`
- Modify: `backend/sales-service/src/main/java/io/smartpos/sales/application/StatsService.java:59,98,130,162,194`

- [ ] **Step 1: Add TenantNotInContextException handler to GlobalExceptionHandler**

Same pattern as Task 5, Step 1. Add the import and handler method.

- [ ] **Step 2: Fix StatsService reads**

StatsService has 5 read operations using `TenantContext.require()` as a parameter in `.setParameter("tenantId", ...)`. For admin users, pass null and modify the queries to handle null tenantId.

Change each occurrence from:
```java
.setParameter("tenantId", TenantContext.require())
```
to:
```java
.setParameter("tenantId", TenantContext.get().orElse(null))
```

Then check each query uses `WHERE (:tenantId IS NULL OR t.tenantId = :tenantId)` pattern.

- [ ] **Step 3: Build, commit**

```bash
cd backend && mvn -pl sales-service -am compile
git add backend/sales-service/
git commit -m "fix: add TenantNotInContextException handler and fix StatsService reads in sales-service"
```

---

### Task 7: Payment, Report, Commerce Services — Fix TenantContext

**Files:**
- Modify: `backend/payment-service/src/main/java/io/smartpos/payment/api/GlobalExceptionHandler.java`
- Modify: `backend/payment-service/src/main/java/io/smartpos/payment/api/TaxController.java:27,34` (reads)
- Modify: `backend/payment-service/src/main/java/io/smartpos/payment/application/DepositService.java:37,41` (reads)
- Modify: `backend/report-service/src/main/java/io/smartpos/report/api/GlobalExceptionHandler.java`
- Modify: `backend/report-service/src/main/java/io/smartpos/report/api/ScheduledReportController.java:25,33` (reads)
- Modify: `backend/report-service/src/main/java/io/smartpos/report/api/ReportDashboardController.java:25,33` (reads)
- Modify: `backend/report-service/src/main/java/io/smartpos/report/application/ForecastService.java:36` (read)
- Modify: `backend/commerce-service/src/main/java/io/smartpos/commerce/api/GlobalExceptionHandler.java`
- Modify: `backend/commerce-service/src/main/java/io/smartpos/commerce/api/admin/PageController.java:29,36,46` (reads)
- Modify: `backend/commerce-service/src/main/java/io/smartpos/commerce/api/admin/StoreSettingsController.java:26` (read)
- Modify: `backend/commerce-service/src/main/java/io/smartpos/commerce/api/storefront/StorefrontCustomerController.java:209` (read)

- [ ] **Step 1: Fix all three services with the same pattern**

For each read operation, replace `TenantContext.require()` with `TenantContext.get().orElse(null)`. Keep `require()` on write/create operations.

For each GlobalExceptionHandler, add the `TenantNotInContextException` handler (same 7-line addition).

- [ ] **Step 2: Build all three**

```bash
cd backend && mvn -pl payment-service,report-service,commerce-service -am compile
```

- [ ] **Step 3: Commit**

```bash
git add backend/payment-service/ backend/report-service/ backend/commerce-service/
git commit -m "fix: add TenantNotInContextException handlers and fix reads in payment/report/commerce services"
```

---

### Task 8: Services Without Exception Handlers — Create Them

**Services:** notification-service, hrm-service, crm-service, document-service, integration-service, ai-service, audit-service

**Files to CREATE:**
- `backend/notification-service/src/main/java/io/smartpos/notification/api/GlobalExceptionHandler.java`
- `backend/hrm-service/src/main/java/io/smartpos/hrm/api/GlobalExceptionHandler.java`
- `backend/crm-service/src/main/java/io/smartpos/crm/api/GlobalExceptionHandler.java`
- `backend/document-service/src/main/java/io/smartpos/documents/api/GlobalExceptionHandler.java`
- `backend/integration-service/src/main/java/io/smartpos/integration/api/GlobalExceptionHandler.java`
- `backend/ai-service/src/main/java/io/smartpos/ai/api/GlobalExceptionHandler.java`
- `backend/audit-service/src/main/java/io/smartpos/audit/api/GlobalExceptionHandler.java`

- [ ] **Step 1: Create GlobalExceptionHandler for each service**

Each follows the same template. Here is notification-service as an example (adjust package name for each):

```java
package io.smartpos.notification.api;

import io.smartpos.common.context.TenantNotInContextException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.server.ResponseStatusException;

import java.util.stream.Collectors;

@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ProblemDetail validation(MethodArgumentNotValidException ex) {
        String message = ex.getBindingResult().getFieldErrors().stream()
                .map(fe -> fe.getField() + ": " + fe.getDefaultMessage())
                .collect(Collectors.joining("; "));
        ProblemDetail pd = ProblemDetail.forStatusAndDetail(HttpStatus.BAD_REQUEST, message);
        pd.setTitle("Validation failed");
        return pd;
    }

    @ExceptionHandler(TenantNotInContextException.class)
    public ProblemDetail tenantNotInContext(TenantNotInContextException ex) {
        ProblemDetail pd = ProblemDetail.forStatusAndDetail(HttpStatus.BAD_REQUEST, ex.getMessage());
        pd.setTitle("Bad request");
        return pd;
    }

    @ExceptionHandler(ResponseStatusException.class)
    public ProblemDetail responseStatus(ResponseStatusException ex) {
        ProblemDetail pd = ProblemDetail.forStatusAndDetail(ex.getStatusCode(), ex.getReason());
        pd.setTitle(ex.getStatusCode().toString());
        return pd;
    }

    @ExceptionHandler(AccessDeniedException.class)
    public ProblemDetail accessDenied(AccessDeniedException ex) {
        ProblemDetail pd = ProblemDetail.forStatusAndDetail(HttpStatus.FORBIDDEN, ex.getMessage());
        pd.setTitle("Access Denied");
        return pd;
    }

    @ExceptionHandler(Exception.class)
    public ProblemDetail generic(Exception ex) {
        ProblemDetail pd = ProblemDetail.forStatusAndDetail(HttpStatus.INTERNAL_SERVER_ERROR,
                "Unexpected error: " + ex.getMessage());
        pd.setTitle("Server error");
        return pd;
    }
}
```

Create this file for each service, adjusting the package name.

- [ ] **Step 2: Fix TenantContext.require() reads in these services**

For each service, change read operations from `TenantContext.require()` to `TenantContext.get().orElse(null)`. Specific files:

| Service | File | Lines |
|---|---|---|
| notification | `NotificationService.java` | 64, 71 (read); 107, 120 (write — keep require) |
| hrm | `AttendanceService.java` | 40, 46, 54 (reads) |
| document | `DocumentController.java` | 70, 95, 104, 117 (reads) |
| document | `TemplateController.java` | 50 (write — keep require) |
| integration | `IntegrationConfigController.java` | 34 (read), 59 (write) |
| integration | `IntegrationController.java` | 34 (read) |
| integration | `WooCommerceService.java` | 52 (write — keep require) |
| integration | `ZatcaService.java` | 61 (write — keep require) |
| ai | `AiAnalyticsController.java` | 36, 47, 58 (reads) |
| ai | `ProductAiService.java` | 446, 490 (writes — keep require) |
| audit | `RetentionController.java` | 33, 44 (reads); 60, 68 (writes) |
| audit | `BackupController.java` | 28 (read) |

- [ ] **Step 3: Build all seven services**

```bash
cd backend && mvn -pl notification-service,hrm-service,crm-service,document-service,integration-service,ai-service,audit-service -am compile
```

- [ ] **Step 4: Commit**

```bash
git add backend/notification-service/ backend/hrm-service/ backend/crm-service/ backend/document-service/ backend/integration-service/ backend/ai-service/ backend/audit-service/
git commit -m "fix: add GlobalExceptionHandler and fix TenantContext reads in 7 services"
```

---

### Task 9: Billing-Service — Add Exception Handler

**Files:**
- Create: `backend/billing-service/src/main/java/io/smartpos/billing/api/GlobalExceptionHandler.java`

- [ ] **Step 1: Create GlobalExceptionHandler**

Same template as Task 8. Package: `io.smartpos.billing.api`. Billing-service has no `TenantContext.require()` calls, so only the handler is needed.

- [ ] **Step 2: Build and commit**

```bash
cd backend && mvn -pl billing-service -am compile
git add backend/billing-service/
git commit -m "fix: add GlobalExceptionHandler to billing-service"
```

---

### Task 10: Deploy and Smoke Test All Services

- [ ] **Step 1: Build all changed services on VPS**

```bash
ssh root@109.199.122.118
cd /var/www/LetisPos && git pull origin main
cd backend

# Rebuild all affected services
for svc in user-service auth-service product-service sales-service payment-service report-service commerce-service billing-service notification-service hrm-service crm-service document-service integration-service ai-service audit-service; do
  sudo -u deploy mvn -B -pl $svc -am clean package -DskipTests -q
  systemctl restart letispos-${svc%-service}
  sleep 5
  systemctl is-active letispos-${svc%-service} && echo "$svc OK" || echo "$svc FAILED"
done
```

- [ ] **Step 2: Smoke test admin endpoints**

```bash
TOKEN=$(curl -s -X POST http://localhost:8080/api/v1/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@smartpos.local","password":"Admin@12345"}' \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['accessToken'])")

# Test each service
curl -s -o /dev/null -w "%{http_code}" "http://localhost:8080/api/v1/users?page=0&size=20" -H "Authorization: Bearer $TOKEN" # expect 200
curl -s -o /dev/null -w "%{http_code}" "http://localhost:8080/api/v1/tenants/admin/all" -H "Authorization: Bearer $TOKEN" # expect 200
curl -s -o /dev/null -w "%{http_code}" "http://localhost:8080/api/v1/warehouses" -H "Authorization: Bearer $TOKEN" # expect 200
curl -s -o /dev/null -w "%{http_code}" "http://localhost:8080/api/v1/billing/plans/admin" -H "Authorization: Bearer $TOKEN" # expect 200
curl -s -o /dev/null -w "%{http_code}" "http://localhost:8080/api/v1/products" -H "Authorization: Bearer $TOKEN" # expect 200
curl -s -o /dev/null -w "%{http_code}" "http://localhost:8080/api/v1/sales/stats/daily" -H "Authorization: Bearer $TOKEN" # expect 200
```

- [ ] **Step 3: Commit any fixes and push**

---

### Phase 2-4 Outline (Separate Plans)

**Phase 2: Tenant Admin UI** — `/smartpos/settings/users` user list with role assignment, `/smartpos/settings/roles` custom role CRUD with permission picker, `/smartpos/settings/users/:id` user detail page. Frontend-only, no backend changes needed (existing API + permissions already support this).

**Phase 3: Super Admin UI** — `/smartpos/admin/users` cross-tenant user browser, `/smartpos/admin/roles` system + all-tenant role management, update `TenantDetailPage` with disable/delete actions + confirmation dialogs. Frontend + minor backend (delete cascade endpoints).

**Phase 4: Hardening** — Soft-delete scheduled job (Spring `@Scheduled`), cascade delete across services, audit logging for lifecycle actions, end-to-end smoke tests.
