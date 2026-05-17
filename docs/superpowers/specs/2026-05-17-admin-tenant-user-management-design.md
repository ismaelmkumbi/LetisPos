# Admin Tenant & User Management — Design Spec

## Summary

Super admins need full lifecycle control over tenants and users: delete (soft +
hard), close, disable — not just suspend/reactivate. The tenant management UI
gets redesigned as a power panel with stats, bulk actions, and proper delete
confirmations. A scoping bug is fixed: normal tenant admins can currently
navigate to `/admin/tenants/list` and see all tenants (via API 403 but UI
loads). Routes get a `RequireAdmin` gate.

---

## Architecture

```
Router.tsx
  /admin/* → <RequireAuth> → <RequireAdmin> → page
                                   ↑ NEW

Auth-service (backend):
  DELETE /api/v1/admin/users/{id}        — soft-delete any user (admin)
  DELETE /api/v1/admin/users/{id}/hard   — hard-delete any user (admin)
  GET    /api/v1/admin/users             — search all users across tenants (admin)
  DELETE /api/v1/tenants/{id}            — already exists (soft delete)
  (no new tenant endpoints needed)

Frontend:
  TenantListPage.tsx       — redesign as Power Panel
  RequireAdmin.tsx         — NEW permission gate component
  UserManagementPanel.tsx  — NEW cross-tenant user search + delete
```

No new services. No database migrations. User delete adds two endpoints to
auth-service's existing controller structure.

---

## Section 1 — Fix the Scoping Bug

### Problem

Routes `/admin/tenants`, `/admin/tenants/list`, `/admin/tenants/:id` are
wrapped in `<RequireAuth>` only — any authenticated user can navigate there.
The API returns 403 for non-admins, but the page shell loads with an error.

### Solution

Create a `<RequireAdmin>` component that checks the JWT for `admin` permission.
Wrap all `/admin/*` routes.

**RequireAdmin.tsx:**
```tsx
function RequireAdmin({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const permissions = user?.permissions ?? [];
  if (!permissions.includes('admin')) {
    return <Navigate to="/smartpos/dashboard" replace />;
  }
  return <>{children}</>;
}
```

Route structure becomes:
```
/admin/tenants       → <RequireAuth> → <RequireAdmin> → <TenantDashboardPage />
/admin/tenants/list  → <RequireAuth> → <RequireAdmin> → <TenantListPage />
/admin/tenants/:id   → <RequireAuth> → <RequireAdmin> → <TenantDetailPage />
```

The backend `@PreAuthorize("hasAuthority('admin')")` on `/admin/all` already
blocks non-admin API access — this frontend gate prevents the UI from loading
at all for non-admins.

---

## Section 2 — Tenant Management Power Panel

### Stats Bar

Four stat cards above the table:

| Active | Trial | Suspended | Deleted |
|--------|-------|-----------|---------|
| Green  | Blue  | Amber     | Red     |

Computed from the tenant list client-side. Shows count + percentage.

### Table Columns

| Column | Description |
|--------|------------|
| ☐ | Checkbox for multi-select |
| Name | Tenant name, clickable → detail page |
| Slug | URL slug, monospace |
| Plan | STARTER / BUSINESS / PROFESSIONAL / ENTERPRISE badge |
| Status | Active / Trial / Past Due / Suspended / Closed / Disabled / Deleted |
| Users | User count (fetched from tenant detail or separate count) |
| Created | Formatted date |
| ⋮ | Actions menu |

### Bulk Actions Bar

Appears when ≥1 row is checked:
```
☐ 3 selected  [Suspend Selected]  [Delete Selected]
```
Delete triggers the same confirmation dialog per tenant.

### Lifecycle Menu (⋮ per row)

Full set of available actions based on current status:

| Current Status | Available Actions |
|----------------|------------------|
| ACTIVE / TRIAL / PAST_DUE | Suspend, Disable, Close, Change Plan |
| SUSPENDED | Reactivate, Close, Delete |
| DISABLED | Reactivate, Delete |
| CLOSED | Reactivate, Delete |
| DELETED | — (already deleted) |

### Delete Confirmation Modal

```
┌──────────────────────────────────────────────┐
│  ⚠️  Delete Tenant — {name}                   │
│                                              │
│  ○ Soft Delete (recommended)                 │
│    • Access blocked immediately              │
│    • Data retained 30 days, then purged      │
│    • Slug & email reserved 30 days           │
│    • Reversible within 30 days               │
│                                              │
│  ○ Hard Delete                               │
│    • Data removed immediately                │
│    • Slug released — anyone can register it  │
│    • Cannot be reversed                      │
│                                              │
│  Type "{name}" to confirm:                   │
│  [________________]                          │
│                                              │
│  [Cancel]  [Hard Delete]  [Soft Delete]      │
└──────────────────────────────────────────────┘
```

Delete buttons (Soft/Hard) are disabled until the tenant name is typed exactly.

---

## Section 3 — User Deletion

### New Backend Endpoints

**`DELETE /api/v1/admin/users/{id}`** — Soft delete
- Sets user status to `DELETED`
- Locks account immediately
- Retains data 30 days
- Requires `admin` authority
- Returns 204 No Content

**`DELETE /api/v1/admin/users/{id}/hard`** — Hard delete
- Removes user record + profile permanently
- Releases email for reuse immediately
- Requires `admin` authority
- Returns 204 No Content
- Only callable on already-soft-deleted users (safety gate)

**`GET /api/v1/admin/users`** — Cross-tenant user search
- Query params: `search`, `tenantId`, `status`, `page`, `size`
- Returns paginated user list with tenant name
- Requires `admin` authority
- Used by UserManagementPanel

### User Delete Flow (Frontend)

```
UserManagementPanel:
  [🔍 Search by email or name...]  [Tenant ▼]
  
  ┌────────────────────────────────────────────┐
  │ USER              │ TENANT      │ ACTIONS  │
  ├───────────────────┼─────────────┼──────────┤
  │ jane@acme.com     │ Acme Stores │ ⋮        │
  │ admin@brewco.com  │ BrewCo      │ ⋮        │
  └────────────────────────────────────────────┘
  
  ⋮ → View Profile / Soft Delete / Hard Delete
```

Delete confirmation includes user email + tenant name warning.

---

## Section 4 — Data Lifecycle After Delete

| Action | Immediate effect | After 30 days |
|--------|-----------------|---------------|
| Soft delete tenant | Status → DELETED, all users locked, slug + admin email reserved, data preserved | Data purged, slug/email released |
| Hard delete tenant | Data purged, slug/email released immediately | — |
| Soft delete user | Status → DELETED, login blocked, email reserved | Purged, email released |
| Hard delete user | Record removed, email released immediately | — |

After soft-delete purge or hard delete, the same email/slug can register again
as a fresh tenant with new setup.

---

## Section 5 — API Contract

### New endpoints in auth-service

```
DELETE /api/v1/admin/users/{id}
  Auth: hasAuthority('admin')
  Response: 204 No Content
  Errors: 404 User not found, 409 User already deleted

DELETE /api/v1/admin/users/{id}/hard
  Auth: hasAuthority('admin')
  Response: 204 No Content
  Errors: 404 User not found, 409 User is not soft-deleted (safety gate)

GET /api/v1/admin/users
  Auth: hasAuthority('admin')
  Query: search, tenantId, status, page, size
  Response: Page<UserDto> with tenantName field
```

### Frontend API additions (auth.ts)

```typescript
export async function deleteUser(id: string, hard?: boolean): Promise<void>
export async function searchAllUsers(params: UserSearchParams): Promise<Page<UserDto>>
export async function deleteTenant(id: string, hard?: boolean, reason?: string): Promise<void>
export async function disableTenant(id: string, reason: string): Promise<Tenant>
```

---

## What's NOT Included

- No billing/payment integration with tenant deletion (handled separately)
- No automated email notification on deletion (notification-service can be added later)
- No data export before deletion (future feature)
- No audit log UI changes (backend already logs these actions)
- No tenant transfer/migration between plans (existing functionality)
