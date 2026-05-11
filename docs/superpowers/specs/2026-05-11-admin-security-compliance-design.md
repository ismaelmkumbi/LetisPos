# Administration — Security & Compliance Design

**Date:** 2026-05-11
**Status:** Approved
**Scope:** Audit Logs, Session Management, API Keys, Data Retention, Error Logs, Optional Branches

---

## Architecture

**New backend service: `audit-service`** (port 8093)

```
GATEWAY  (API Key filter, IP allowlist filter)
  │
  ├── auth-service      ──┐
  ├── user-service      ──┤
  ├── product-service   ──┤  async fire-and-forget
  ├── sales-service     ──┼── audit events ──→ audit-service
  ├── inventory-service ──┤                         │
  ├── payment-service   ──┤                    PostgreSQL
  ├── document-service  ──┤                    (audit_events, api_keys,
  └── ...               ──┘                     error_logs, retention_config)
```

- All services publish audit-relevant events to the audit-service via async REST (fire-and-forget).
- JPA auditing (`@CreatedBy`/`@LastModifiedBy`) is enabled across all entities — entities track who touched them last, audit-service tracks the full change history.
- The audit-service is write-only from other services, read-only from the admin UI.
- All admin endpoints are gated behind a new `admin` authority. Only platform owners/super admins hold it.

---

## Sidebar & Routes

The Administration subheader is reorganised:

```
Administration
├── Preferences              (existing)
├── Users & Roles            (move from People subheader)
├── Tenants                  (existing)
├── Branches                 (NEW — optional)
├── POS Terminals            (existing)
├── Receipt Settings         (existing)
├── Printer Settings         (existing)
├── Tax & Pricing            (existing)
├── Languages                (existing)
├── Localization             (existing)
├── Notifications            (existing)
├── ─────────────────
├── Audit Logs               (NEW)
├── Sessions                 (NEW)
├── API Keys                 (NEW)
├── Data Retention           (NEW)
├── Error Logs               (NEW)
```

"Subscription & Billing" and "Backups" are deferred to the System Health sub-project.

---

## 1. Audit Logs

**Page:** `/smartpos/admin/audit-logs`

### Event model
```
AuditEvent {
  id: UUID
  timestamp: Instant
  service: string               // "auth-service", "product-service", ...
  actor: { userId, userName, role }
  action: string                 // "product.created", "user.password_changed"
  target: { type, id, label }    // "product", "abc-123", "Milk 500ml"
  diff?: { field, from, to }[]   // for updates
  tenantId: UUID
  ip?: string
  userAgent?: string
}
```

### Tracked actions

| Category | Actions |
|---|---|
| Auth | login, login_failed, logout, token_refreshed, password_changed, account_locked, account_unlocked |
| Users | created, updated, deleted, status_changed, role_assigned, permission_changed, warehouse_assigned |
| Roles | created, updated, deleted, permissions_modified |
| Products | created, updated, deleted, price_changed, batch_received |
| Sales | created, voided, returned, payment_refunded |
| Stock | adjusted, transferred, damaged_recorded, damage_approved |
| Settings | any settings change across all modules |
| API Keys | created, revoked, rotated, scopes_updated |
| Retention | purge_executed, retention_config_changed |

### UI features

| Feature | Detail |
|---|---|
| Timeline table | Paginated, latest-first, columns: timestamp, actor, action, target, diff summary |
| Filters | By service, action type, actor, date range, target type |
| Search | Full-text across event descriptions |
| Detail drawer | Click a row → full event detail with diff, IP, user agent |
| Export | Download filtered results as CSV/PDF |
| Retention banner | "Events older than X months are auto-purged" (links to Data Retention page) |

### Backend

- `POST /api/v1/audit/events` — ingest events from other services (internal, shared-secret auth)
- `GET /api/v1/admin/audit-events` — paginated list with filters
- `GET /api/v1/admin/audit-events/{id}` — single event detail
- `GET /api/v1/admin/audit-events/export` — CSV/PDF export

---

## 2. Session Management

**Page:** `/smartpos/admin/sessions`

### Backend endpoints

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/v1/admin/sessions` | List all active sessions (user, device, IP, last activity, age) |
| DELETE | `/api/v1/admin/sessions/{tokenId}` | Force-revoke a specific session |
| POST | `/api/v1/admin/sessions/bulk-revoke` | Revoke by criteria: user, older-than, IP-range |

### UI features

| Feature | Detail |
|---|---|
| Sessions table | User, device/OS, IP, location (geo-IP), last active, session age |
| Status chip | Active / Expired / Revoked |
| Search | By user name, email, or IP |
| Actions | Revoke single session, revoke all sessions for a user |
| Stats bar | Total active sessions, unique users online, new sessions today |
| Auto-refresh | Toggle-able 30s poll |

Session revocation invalidates the refresh token in auth-service. Next refresh attempt from that client returns 401.

---

## 3. API Keys

**Page:** `/smartpos/admin/api-keys`

### Model
```
ApiKey {
  id: UUID
  label: string
  prefix: string              // "sk_live_a3f2..." stored; full secret hashed
  secretHash: string          // bcrypt
  scopes: string[]            // permission authorities
  createdBy: { userId, userName }
  tenantId: UUID
  expiresAt?: Instant
  lastUsedAt?: Instant
  status: ACTIVE | REVOKED | EXPIRED
  createdAt: Instant
}
```

### Auth flow

API key sent as `X-API-Key: sk_live_xxxx` header. Gateway filter validates it, loads the associated user + scoped permissions into the security context.

### Backend endpoints

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/v1/admin/api-keys` | List all keys (secret never exposed) |
| POST | `/api/v1/admin/api-keys` | Create key — returns full secret ONCE |
| PUT | `/api/v1/admin/api-keys/{id}` | Update scopes, expiry, or label |
| DELETE | `/api/v1/admin/api-keys/{id}` | Revoke (soft-delete) |
| POST | `/api/v1/admin/api-keys/{id}/rotate` | New secret, expire old one (24h grace) |

### UI features

| Feature | Detail |
|---|---|
| Keys table | Label, masked prefix, creator, scopes count, expiry, status |
| Create dialog | Label, permission scopes (checkboxes grouped by category), optional expiry date |
| Secret reveal | Full secret shown once with copy button and storage warning |
| Rotate | One-click — old key expires after 24h grace period |
| Revoke | Irreversible; confirmation dialog |

---

## 4. Data Retention & Auto-Purge

**Page:** `/smartpos/admin/data-retention`

### Retention rules

| Entity | Default | Min | Max |
|---|---|---|---|
| Audit events | 12 months | 3 months | 36 months |
| Sales (voided) | 24 months | 6 months | 60 months |
| Stock movements | 36 months | 12 months | 60 months |
| Error logs | 6 months | 1 month | 24 months |
| Revoked sessions | 3 months | 1 month | 12 months |
| Archived customers | 36 months | 12 months | 60 months |

### Mechanism

- Scheduled job in audit-service runs daily at 3am tenant-local time.
- For each tenant, checks each rule. Records exceeding retention are purged (soft-delete for business data, hard-delete for logs/events).
- Every purge produces an `retention.purge_executed` audit event with count.
- 7 days before a scheduled purge, an alert appears in the admin dashboard.

### UI features

| Feature | Detail |
|---|---|
| Rules table | Entity type, current retention period, next purge date, estimated records affected |
| Edit dialog | Slider/select for retention period within bounds |
| Manual purge | "Purge now" button per entity with record count preview + confirmation |
| Purge history | Expandable timeline: date, entity, count, trigger (schedule/manual, actor) |
| Exemption list | Option to mark specific records as "retain permanently" |

---

## 5. Error Logs

**Page:** `/smartpos/admin/error-logs`

### Model
```
ErrorLog {
  id: UUID
  service: string
  level: ERROR | WARN
  message: string
  stackTrace?: string
  context?: JSON          // request path, user ID, tenant ID if available
  tenantId?: UUID
  occurredAt: Instant
}
```

### Backend

Each microservice posts errors to `POST /api/v1/audit/error-logs` (internal, shared-secret auth). The audit-service stores and indexes them.

### UI features

| Feature | Detail |
|---|---|
| Table | Timestamp, service, level (color-coded chip), message preview |
| Level filter | Error / Warn / All |
| Service filter | Dropdown of emitting services |
| Date range | From/To date pickers |
| Detail drawer | Full message, stack trace (monospace, collapsible), context JSON |
| Stats | Error count by service (last 24h), trend sparkline |
| Auto-delete | "Logs older than your retention setting are auto-cleaned" banner |

---

## 6. Branches (Optional)

**Page:** `/smartpos/admin/branches`

### Principle

Branches are an optional organisational layer. They do not change any existing behaviour — a tenant with zero branches operates identically to today. Branches are invisible to all other modules unless explicitly configured.

### Model
```
Branch {
  id: UUID
  name: string
  code: string              // "MALL", "DOWNTOWN"
  address?: string
  city?: string
  phone?: string
  active: boolean
  tenantId: UUID
  createdAt: Instant
}
```

### Relationship

Warehouse gets an optional `branchId` FK. Null = unassigned (current behaviour).

### UI features

| Feature | Detail |
|---|---|
| Branch list | Simple table: name, code, city, warehouse count, active status |
| Create/edit dialog | Name (required), code, address, city, phone (optional) |
| Warehouse assignment | Optional "Branch" dropdown in warehouse edit form |
| Branch filter | Branch filter on warehouse list, terminal list, stock views — only visible when ≥1 branch exists |
| Delete guard | Cannot delete a branch that has warehouses assigned |

### Non-goals

- No branch-scoped settings or taxation
- No branch-level permissions
- No branch switching in POS kiosk view (deferred)
- No cascading from branches to child entities

---

## Security Permissions

New authorities added to the existing set:

| Authority | Purpose |
|---|---|
| `admin` | Gate for all admin pages (audit, sessions, API keys, retention, error logs) |
| `branch.view` | Read branches |
| `branch.manage` | Create/edit/delete branches |
| `api_key.manage` | Create/rotate/revoke API keys |
| `audit.view` | View audit logs |
| `session.manage` | View and revoke sessions |
| `retention.manage` | Configure data retention rules |
| `error_log.view` | View error logs |

---

## Implementation Order

1. **Branches** — simplest, standalone, no dependencies on audit-service
2. **audit-service scaffolding** — new service, database, JPA auditing across existing services
3. **Audit Logs page** — verify end-to-end event flow
4. **Error Logs page** — piggybacks on audit-service
5. **Session Management** — backend endpoints + UI
6. **API Keys** — backend + gateway filter + UI
7. **Data Retention** — scheduled job + UI, last because it depends on audit events existing
