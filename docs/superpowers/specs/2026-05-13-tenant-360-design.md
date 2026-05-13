# Tenant 360° — Unified Administration Hub

## Scope
Restructure scattered tenant/billing pages into a cohesive sidebar section with 5 pages.

## Sidebar
```
Administration
├── ...
├── Tenants & Subscriptions    ← subheader
│   ├── Dashboard              ← /smartpos/admin/tenants
│   ├── All Tenants            ← /smartpos/admin/tenants/list
│   ├── Plans                  ← /smartpos/admin/billing/plans (existing)
│   └── Invoices               ← /smartpos/admin/billing/invoices
├── POS Terminals
├── ...
```

## Pages

### 1. Dashboard — `/smartpos/admin/tenants`
- 4-6 KPI cards: total tenants, active, trials, MRR, past due, churn risk
- Trial expiry alerts card (expiring within 7 days)
- Recent activity feed (latest status changes)
- Quick-action buttons: Create Tenant, Manage Plans

### 2. All Tenants — `/smartpos/admin/tenants/list`
- DataTable: name, slug, plan (color badge), status (color chip), users count, created date
- Filters: plan dropdown, status dropdown, search
- "Create Tenant" button → inline dialog (name, slug, admin email, plan, trial days)
- Row click → `/smartpos/admin/tenants/:id`
- Row actions: change plan quick-action, suspend/reactivate
- Bulk export

### 3. Tenant Detail — `/smartpos/admin/tenants/:id`
Split layout:
- **Left column (profile card)**: name, slug, status chip, plan badge, trial start/end, created date
- **Right column (subscription)**: current plan info, change plan dropdown, billing cycle toggle, trial extension, lifecycle buttons (suspend/reactivate/close with reason dialog)
- **Full-width below**: invoice history table (filtered to this tenant), usage stats vs plan limits

### 4. Plans — `/smartpos/admin/billing/plans` (already built, keep as-is)

### 5. Invoices — `/smartpos/admin/billing/invoices`
- DataTable: invoice #, tenant name, amount, status (PAID/PENDING/OVERDUE), due date
- Filters: status, tenant search, date range
- "Mark Paid" action per row (super-admin only)

## Backend Required
None — all pages use existing APIs:
- `fetchTenants()`, `fetchTenant(id)` — auth.ts
- `suspendTenant`, `reactivateTenant`, `closeTenant` — auth.ts
- `createTenant` — auth.ts (if not already)
- `updateTenant` — auth.ts
- `listAllPlans`, `updatePlan` — billing.ts
- `listInvoices` — billing.ts
- `getSubscription`, `updateSubscription` — billing.ts

## Route Cleanup
- Remove `/smartpos/settings/tenants` (TenantsSettings from SettingsPlaceholder)
- Keep `/smartpos/billing` (TenantBillingPage — tenant self-service)
- Add new routes under `/smartpos/admin/tenants/**`

## Files
- Create: `TenantDashboardPage.tsx`, `TenantListPage.tsx`, `TenantDetailPage.tsx`, `InvoiceListPage.tsx`
- Modify: `SmartPosMenuItems.ts`, `Router.tsx`
- Remove/cleanup: TenantsSettings from SettingsPlaceholder
