# Users, Roles & Tenant Administration — Design Spec

**Date:** 2026-05-14
**Status:** Draft
**Author:** Ismael Mkumbi

## 1. Problem

The current system has a single ADMIN role shared by platform owners and tenant admins.
The first user who creates a tenant gets all 83 permissions including platform-level ones
(`admin`, `tenant.suspend`, `billing.manage`, `audit.view`). There is no middle ground between
CASHIER (9 POS permissions) and ADMIN (all permissions). Additionally, admin endpoints return
500s because admin users have no `tenantId` in their JWT — a problem partially fixed today
across multiple services but still requiring spec-level standardization.

## 2. Goals

1. Introduce distinct system roles: SUPER_ADMIN, TENANT_ADMIN, MANAGER, CASHIER
2. SUPER_ADMIN is cross-tenant, bypasses tenant scoping, manages all tenants
3. TENANT_ADMIN has full control within their own tenant but zero platform access
4. Super admin can manage tenant lifecycle: delete, disable, suspend, reactivate
5. Tenant admin can create custom roles and manage users within their tenant
6. Feature access is permission-driven — no per-user feature flags
7. All admin endpoints work correctly regardless of whether caller has a tenantId

## 3. Roles Design

### 3.1 System Roles (seeded, immutable by tenants)

| Role            | Who Gets It                                      | Permission Count | Scope       |
|-----------------|--------------------------------------------------|-----------------|-------------|
| `SUPER_ADMIN`   | Bootstrap platform owner                         | All 83+         | Cross-tenant |
| `TENANT_ADMIN`  | First user in a new tenant                       | ~50 business    | Own tenant   |
| `MANAGER`       | Assigned by TENANT_ADMIN to senior staff         | ~35 operational | Own tenant   |
| `CASHIER`       | Default for new users after first in tenant      | 9 POS           | Own tenant   |

### 3.2 Permission Categories

**Platform-only (SUPER_ADMIN only — 11 permissions):**
`admin`, `tenant.suspend`, `billing.view`, `billing.manage`, `audit.view`,
`session.manage`, `retention.manage`, `error_log.view`, `api_key.manage`,
`branch.view`, `branch.manage`

**Tenant admin + platform (TENANT_ADMIN — ~50 permissions):**
`user.view`, `user.create`, `user.update`, `user.delete`, `role.view`, `role.manage`,
`product.*`, `category.manage`, `customer.manage`, `supplier.manage`, `warehouse.manage`,
`stock.*`, `sale.*`, `pos.use`, `pos.terminal.*`, `quotation.manage`, `purchase.*`,
`payment.*`, `account.*`, `expense.manage`, `deposit.manage`,
`report.*`, `settings.manage`, `settings.i18n`,
`notification.*`, `hrm.*`, `recurring.*`, `ai.*`, `integration.*`,
`coupon.manage`, `promotion.manage`

**Manager (~35 permissions):**
`user.view`, `product.*`, `category.manage`, `customer.manage`, `supplier.manage`,
`stock.*`, `sale.*`, `pos.use`, `pos.terminal.view`, `purchase.*`, `payment.view`,
`payment.record`, `report.sales`, `report.inventory`, `hrm.view`, `hrm.attendance.write`,
`hrm.leave.request`, `recurring.view`, `ai.insight`, `ai.chat`

**Cashier (9 permissions):**
`pos.use`, `sale.view`, `sale.create`, `sale.return`, `product.view`, `customer.manage`,
`stock.view`, `quotation.manage`, `payment.record`

### 3.3 Migration Strategy

1. Rename existing `ADMIN` role (UUID `000...001`) to `SUPER_ADMIN`, update its label
2. Create new `TENANT_ADMIN` role (new UUID) with scoped permissions
3. Create new `MANAGER` role (new UUID)
4. Existing `CASHIER` role unchanged
5. Add migration to reassign existing tenant users: first user per tenant gets TENANT_ADMIN
   instead of the old ADMIN role
6. All existing permissions remain unchanged

## 4. Tenant Lifecycle

### 4.1 Statuses

```
TRIAL → ACTIVE → CLOSED
  ↓        ↓
TRIAL_EXPIRED  PAST_DUE → SUSPENDED
                          ↓
                        CLOSED
```

**New statuses to add:**
- `DISABLED` — admin-initiated deactivation (not payment-related), blocks login, reversible
- `DELETED` — soft-deleted, data retained for 30 days before hard deletion

### 4.2 Super Admin Operations on Tenants

| Action       | Endpoint                                | Auth                         | Reversible |
|--------------|-----------------------------------------|------------------------------|------------|
| List all     | `GET /api/v1/tenants/admin/all`        | `hasAuthority('admin')`      | —          |
| View detail  | `GET /api/v1/tenants/{id}`             | `admin` or tenant match      | —          |
| Change plan  | `PATCH /api/v1/tenants/{id}`           | `hasAuthority('admin')`      | Yes        |
| Suspend      | `POST /api/v1/tenants/{id}/suspend`    | `hasAuthority('tenant.suspend')` | Yes    |
| Reactivate   | `POST /api/v1/tenants/{id}/reactivate` | `hasAuthority('tenant.suspend')` | Yes    |
| Disable      | `POST /api/v1/tenants/{id}/disable`    | `hasAuthority('tenant.suspend')` | Yes    |
| Close        | `POST /api/v1/tenants/{id}/close`      | `hasAuthority('tenant.suspend')` | No     |
| Delete       | `DELETE /api/v1/tenants/{id}`          | `hasAuthority('admin')`      | No       |

### 4.3 Delete Behavior

- Soft delete: sets status to `DELETED`, data retained 30 days
- Hard delete (scheduled job): cascades through all services
- Confirmation requires typing the tenant name
- Audit log entry created for every lifecycle action

## 5. How Auth Works

### 5.1 JWT Claims

```
{
  "sub": "<userId>",
  "tenantId": "<tenantId>",      // null for SUPER_ADMIN
  "tenantStatus": "ACTIVE",
  "billingPlan": "ENTERPRISE",
  "permissions": ["admin", "user.view", ...],
  "roles": ["SUPER_ADMIN"],
  "tenantMaxUsers": 2147483647,
  "tenantMaxStores": 2147483647
}
```

### 5.2 Tenant Context Behavior

| Caller Type    | tenantId in JWT | TenantContext.get() | Data Scope          |
|----------------|-----------------|---------------------|---------------------|
| SUPER_ADMIN    | null            | Optional.empty()    | All tenants         |
| TENANT_ADMIN   | <uuid>          | Optional.of(uuid)   | Own tenant only     |
| MANAGER        | <uuid>          | Optional.of(uuid)   | Own tenant only     |
| CASHIER        | <uuid>          | Optional.of(uuid)   | Own tenant only     |

### 5.3 Standard Access Pattern

Every service that uses `TenantContext` should follow this pattern:

```java
// Read operations — allow admin bypass
UUID tenantId = TenantContext.get().orElse(null);
if (tenantId != null) {
    // filter by tenantId
} else {
    // admin — return all
}

// Write operations — require tenant context (admin can't create on behalf of tenants)
UUID tenantId = TenantContext.require();
```

## 6. UI Pages

### 6.1 Super Admin Pages (`/smartpos/admin/`)

| Route                          | Component              | Purpose                                   |
|--------------------------------|------------------------|-------------------------------------------|
| `/admin/tenants`               | TenantDashboardPage    | KPI cards, trial expiry, recent activity  |
| `/admin/tenants/list`          | TenantListPage         | All tenants table with plan/status filter |
| `/admin/tenants/:id`           | TenantDetailPage       | View/manage single tenant + lifecycle ops |
| `/admin/users`                 | AdminUsersPage         | **New:** cross-tenant user browser        |
| `/admin/roles`                 | AdminRolesPage         | **New:** system + all-tenant role CRUD    |
| `/admin/billing/plans`         | SmartPosBillingPlans   | Platform billing plan configuration       |
| `/admin/billing/invoices`      | InvoiceListPage        | All invoices across tenants               |
| `/admin/audit-logs`            | SmartPosAuditLogs      | Platform audit trail                      |
| `/admin/sessions`              | SmartPosSessions       | Active session management                 |
| `/admin/error-logs`            | SmartPosErrorLogs      | Error log viewer                          |
| `/admin/api-keys`              | SmartPosApiKeys        | API key management                        |
| `/admin/data-retention`        | SmartPosDataRetention  | Data retention policies                   |
| `/admin/backups`               | SmartPosBackups        | Database backups                          |

### 6.2 Tenant Admin Pages (`/smartpos/settings/`)

| Route                          | Component              | Purpose                                   |
|--------------------------------|------------------------|-------------------------------------------|
| `/settings/users`              | SmartPosUsersRoles     | Manage own tenant's users and roles       |
| `/settings/users/:id`          | UserDetailPage         | **New:** view/edit single user, assign roles |
| `/settings/roles`              | RolesPage              | **New:** custom role CRUD for tenant      |
| `/settings/billing`            | TenantBillingPage      | Own subscription, invoices, payment methods |

## 7. Implementation Phases

### Phase 1: Database & Backend Foundation (no UI changes)
- Create new system roles migration (TENANT_ADMIN, MANAGER)
- Rename ADMIN to SUPER_ADMIN
- Add tenant reassignment migration (first user → TENANT_ADMIN)
- Add DISABLED, DELETED to TenantStatus enum
- Add disable/delete endpoints to TenantController
- Fix remaining `TenantContext.require()` → `get()` in all services
- Add `TenantNotInContextException` handler to all services missing it
- Add `@PreAuthorize` on lifecycle endpoints

### Phase 2: Tenant Admin UI
- `/smartpos/settings/users` — user list with role assignment
- `/smartpos/settings/roles` — custom role CRUD with permission picker
- `/smartpos/settings/users/:id` — user detail/edit page

### Phase 3: Super Admin UI
- `/smartpos/admin/users` — cross-tenant user browser
- `/smartpos/admin/roles` — system + all-tenant role management
- Update `TenantDetailPage` with disable/delete actions + confirmation dialogs

### Phase 4: Hardening
- Soft-delete scheduled job (30-day retention)
- Cascade delete across all services
- Audit logging for all lifecycle actions
- Smoke tests for all admin flows

## 8. Open Questions

1. Should deleted tenant data be exportable before hard delete? (Recommend: yes, admin can export JSON dump)
2. Should tenant admins be able to promote another user to TENANT_ADMIN? (Recommend: yes, within their tenant)
3. Should MANAGER role be customizable per tenant? (Recommend: yes, it's a template that tenant admins can clone and modify)
