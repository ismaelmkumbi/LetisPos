# Dynamic Feature & Menu Management — Design Spec

**Date**: 2026-05-19
**Status**: Approved
**Scope**: Replace static plan-based feature gating with a fully dynamic, database-driven enterprise system

## Overview

Transform the current hardcoded feature gating system (plan levels → fixed features) into a dynamic system where the Super Admin can:

- Add/remove features to any subscription plan via drag-and-drop
- Grant or deny specific features per tenant (beyond their plan)
- Grant or deny specific features per user (exceptions)
- Build and manage the sidebar menu with a drag-and-drop visual plan comparison builder
- Menu visibility is automatically driven by feature availability (linked approach)

## Key Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Feature granularity | Action-level | Maps to existing permissions (`hrm.payroll.view`, `ai.insight`) |
| Feature ↔ Menu relationship | Linked | Feature drives menu. Grant feature → menu auto-appears. One source of truth. |
| Menu builder style | Visual plan comparison | 4-column side-by-side drag-and-drop between plans |
| Tenant admin user control | Roles + per-user overrides | Bulk assignment via roles, exceptions via per-user toggles |
| Migration strategy | Big bang | Replace entire system in one release |

## Architecture

### Actor Hierarchy

```
Super Admin (Platform Owner)
  ├─ Manages: Plans, Features, Menus, All Tenants, All Users
  ├─ Controls: Feature ↔ Plan mapping, Tenant overrides, User overrides, Menu structure
  └─ Full god-mode over the platform (existing SUPER_ADMIN role)

Tenant Admin (Shop Owner)
  ├─ Chooses: Subscription plan, can upgrade/downgrade
  ├─ Manages: Own users — assigns roles, sets per-user feature overrides
  └─ Cannot: Modify plan definitions, access features not in their plan + overrides

Regular User (Staff)
  └─ Sees: Only what plan + tenant overrides + user overrides + role grant them
```

### Data Model

All new tables live in **user-service** database.

#### feature_definitions

Catalog of all toggleable features. Keys use the same namespace as existing permissions.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| key | VARCHAR(100) UNIQUE | e.g., `hrm.payroll.view`, `ai.insight` |
| label | VARCHAR(100) | Human name: "Payroll Management" |
| description | TEXT | What this feature enables |
| category | VARCHAR(50) | Grouping: SALES, HRM, FINANCE, CRM, AI, ADMIN |
| is_active | BOOLEAN | Soft disable without deleting |
| sort_order | INT | Display order in admin panels |

#### feature_assignments

Who gets what. Resolution: USER > TENANT > PLAN (most specific wins).

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| feature_key | VARCHAR(100) FK | References feature_definitions.key |
| assignment_level | ENUM(PLAN, TENANT, USER) | Resolution priority |
| target_id | VARCHAR(100) | Plan code, tenant UUID, or user UUID |
| granted | BOOLEAN | true = grant, false = explicitly deny |
| created_by | UUID | Super admin who made the assignment |

#### menu_definitions

Full menu tree, database-driven. Rendered by frontend.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| parent_id | UUID FK (self) | null = top-level section |
| key | VARCHAR(100) UNIQUE | Programmatic identifier |
| label | VARCHAR(100) | Display text |
| icon | VARCHAR(50) | Tabler icon name |
| route | VARCHAR(255) | Frontend route (null for section headers) |
| required_feature_key | VARCHAR(100) FK | Feature required for visibility |
| sort_order | INT | Position within parent |
| is_visible | BOOLEAN | Global visibility toggle |
| is_section_header | BOOLEAN | Non-clickable section divider |

#### path_feature_mappings (new table for gateway)

Maps API path patterns to required features. Replaces hardcoded FeatureGateFilter.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| path_pattern | VARCHAR(255) | Ant-style pattern: `/api/v1/hrm/**` |
| required_feature_key | VARCHAR(100) FK | Feature required to access |
| http_status_on_deny | INT | HTTP status code (402 recommended) |
| sort_order | INT | Evaluation order |

### Resolution Engine

#### On Login

1. auth-service validates credentials, loads tenant info
2. auth-service calls `GET /api/internal/features/resolved?tenantId=X&userId=Y` on user-service
3. user-service resolves features:
   - Load plan-level assignments (base)
   - Apply tenant-level overrides (add/remove)
   - Apply user-level overrides (add/remove)
   - Most-specific grant wins, explicit deny at any level removes
4. Resolved feature set returned, embedded in JWT as `features[]` claim
5. Additionally, `permissions[]` claim still carries granular permissions for @PreAuthorize checks

```json
{
  "sub": "user-uuid",
  "tenantId": "tenant-uuid",
  "billingPlan": "BUSINESS",
  "roles": ["TENANT_ADMIN"],
  "permissions": ["sale.create", "product.view", "..."],
  "features": ["pos.use", "sale.*", "product.*", "stock.*", "purchase.*", "finance.*"],
  "tenantMaxUsers": 5,
  "tenantMaxStores": 3
}
```

#### Feature Resolution SQL

```sql
WITH resolved AS (
  SELECT feature_key, granted,
    ROW_NUMBER() OVER (
      PARTITION BY feature_key
      ORDER BY CASE assignment_level
        WHEN 'USER' THEN 1
        WHEN 'TENANT' THEN 2
        WHEN 'PLAN' THEN 3
      END
    ) AS priority
  FROM feature_assignments
  WHERE (assignment_level = 'PLAN'   AND target_id = :planCode)
     OR (assignment_level = 'TENANT' AND target_id = :tenantId)
     OR (assignment_level = 'USER'   AND target_id = :userId)
)
SELECT feature_key FROM resolved WHERE priority = 1 AND granted = true
```

#### Gateway: DynamicFeatureGateFilter

Replaces the hardcoded `FeatureGateFilter.java`.

1. Extract `features[]` from JWT
2. Look up `path_feature_mappings` for the request path (cached in Redis)
3. If path requires a feature and user doesn't have it → return 402 UPGRADE_REQUIRED
4. SUPER_ADMIN bypasses all checks

#### Frontend: Dynamic Menu & Guards

On app load:
1. `GET /api/v1/menu` — backend parses JWT `features[]`, filters menu tree server-side, returns only visible items
2. Frontend renders the response directly — no client-side filtering needed
3. `hasFeature(key)` replaces `hasPlan()`, `PlanGate.tsx`, `filterByPlan()`

**Files removed:**
- `SmartPosMenuItems.ts` — replaced by API response
- `planGates.ts` — replaced by dynamic feature resolution
- `PlanGate.tsx` — replaced by `hasFeature()` guard
- `FeatureGateFilter.java` — replaced by `DynamicFeatureGateFilter`

### Admin UI: Three-Tab Workspace

#### Tab 1: Plan Comparison

Four side-by-side columns (STARTER | BUSINESS | PROFESSIONAL | ENTERPRISE). Each column shows features assigned to that plan. Drag a feature from the catalog into a plan column to grant it. Drag a feature out of a column (to a drop-to-remove zone) to revoke it. Right-click on any feature for: Edit metadata, Copy to other plans, Preview as tenant, View usage stats.

Category filter pills at the top (All, Sales, HRM, Finance, AI, CRM). Search bar to find features quickly.

#### Tab 2: Feature Catalog

Table view of all `feature_definitions`. Create, edit, soft-delete features. Shows: feature key, label, category, which plans have it by default, active status.

#### Tab 3: Tenant & User Overrides

Dual search: find a tenant or user. Shows their current plan and baseline features. Two columns: "Extra Features" (granted beyond plan) and "Denied Features" (removed despite plan). Add/remove overrides inline.

### Caching Strategy

| Cache Key | TTL | Invalidation Trigger |
|-----------|-----|---------------------|
| `features:plan:{code}` | 30 min | Plan feature assignment change |
| `features:tenant:{id}` | 5 min | Tenant override change |
| `features:user:{id}` | 5 min | User override change |
| `menu:full-tree` | 30 min | Menu structure change |
| `path:feature:mappings` | 30 min | Path mapping change |

Client-side: Features and menu cached in AuthContext for session lifetime. Token refresh picks up changes. `X-Features-Refresh: true` response header triggers immediate re-fetch.

### Files to Create

#### Backend (user-service)
- `FeatureDefinition.java` — JPA entity
- `FeatureAssignment.java` — JPA entity
- `MenuDefinition.java` — JPA entity
- `PathFeatureMapping.java` — JPA entity
- `FeatureDefinitionRepository.java`
- `FeatureAssignmentRepository.java`
- `MenuDefinitionRepository.java`
- `PathFeatureMappingRepository.java`
- `FeatureResolutionService.java` — resolution logic
- `MenuService.java` — menu tree building + filtering
- `FeatureController.java` — admin CRUD endpoints
- `MenuController.java` — admin CRUD + public menu endpoint
- `InternalFeatureController.java` — internal endpoint for auth-service
- Flyway migration files

#### Backend (gateway)
- `DynamicFeatureGateFilter.java` — replaces FeatureGateFilter

#### Backend (auth-service)
- Update `LoginUseCase.java` — add feature resolution call
- Update `JwtTokenService.java` — add `features[]` claim

#### Frontend
- `src/api/smartpos/features.ts` — feature/menu API client
- `src/pages/admin/FeatureManager.tsx` — admin workspace (3 tabs)
- `src/pages/admin/PlanComparison.tsx` — tab 1
- `src/pages/admin/FeatureCatalog.tsx` — tab 2
- `src/pages/admin/TenantUserOverrides.tsx` — tab 3
- `src/hooks/useFeatures.ts` — `hasFeature()` hook
- Update `AuthContext.tsx` — load features + menu on login
- Update `SidebarItems.tsx` — render from API response
- Update `Router.tsx` — replace PlanGate with hasFeature checks
- Remove `SmartPosMenuItems.ts`, `planGates.ts`, `PlanGate.tsx`

### Files to Remove
- `backend/gateway/.../FeatureGateFilter.java`
- `frontend/src/config/planGates.ts`
- `frontend/src/layouts/.../SmartPosMenuItems.ts`
- `frontend/src/routes/smartpos/PlanGate.tsx`

### API Endpoints

#### Admin Endpoints (requires `admin` authority)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/admin/features` | List all feature definitions |
| POST | `/api/v1/admin/features` | Create feature definition |
| PUT | `/api/v1/admin/features/{id}` | Update feature definition |
| DELETE | `/api/v1/admin/features/{id}` | Soft-delete feature |
| GET | `/api/v1/admin/features/assignments` | List assignments (filter by plan/tenant/user) |
| POST | `/api/v1/admin/features/assignments` | Create assignment |
| DELETE | `/api/v1/admin/features/assignments/{id}` | Remove assignment |
| GET | `/api/v1/admin/menu` | Get full menu tree (all items, unfiltered) |
| POST | `/api/v1/admin/menu` | Create menu item |
| PUT | `/api/v1/admin/menu/{id}` | Update menu item |
| DELETE | `/api/v1/admin/menu/{id}` | Delete menu item |
| PUT | `/api/v1/admin/menu/reorder` | Batch reorder (accepts array of {id, parentId, sortOrder}) |

#### Public/User Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/menu` | Get filtered menu tree for current user (parses JWT features) |

#### Internal Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/internal/features/resolved` | Resolve features for a user (X-Internal-Token) |

### Migration Plan (Big Bang)

1. Create Flyway migrations for new tables
2. Seed `feature_definitions` from existing permissions in V1 migration
3. Seed `feature_assignments` at PLAN level matching current hardcoded mapping
4. Seed `menu_definitions` from current `SmartPosMenuItems.ts` structure
5. Seed `path_feature_mappings` from current `FeatureGateFilter.java` mapping
6. Build and test admin UI
7. Update gateway, auth-service, and frontend
8. Deploy as single release
9. Verify: all tenants see same features as before, admin can now modify dynamically

### Rollback Plan

Since this is big-bang: keep the old `FeatureGateFilter.java` and `SmartPosMenuItems.ts` in the repo for one release cycle (unused but available for hotfix rollback). Database migrations are additive (new tables only, no destructive changes to existing tables). Rollback = revert code deploy, new tables are harmless if unused.
