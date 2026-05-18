# Admin Troubleshooting Module

**Date:** 2026-05-18  
**Status:** design

## Problem

Admin users have no UI access to heavy operational tools like the WAC backfill. These operations require direct API calls with a JWT — impractical for non-technical admins. A central place is needed where admin tools can be surfaced and run safely with clear feedback.

## Solution

Add a "Troubleshooting" page under the Administration section of the admin sidebar. The page hosts a grid of operation cards — each card is a self-contained tool with a description, run button, and inline result area. The WAC backfill is the first card.

## Architecture

```
SmartPosMenuItems.ts          Router.tsx              TroubleshootingPage.tsx
  "Troubleshooting"    →    /admin/troubleshooting  →   Card grid of operations
                                                           │
                              POST /api/v1/sales/backfill-wac   (already exists)
```

### Files

| Action | File | Purpose |
|---|---|---|
| Modify | `frontend/src/layouts/full/vertical/sidebar/SmartPosMenuItems.ts` | Add Troubleshooting menu item under Administration |
| Modify | `frontend/src/routes/Router.tsx` | Register `/smartpos/admin/troubleshooting` route |
| Create | `frontend/src/views/smartpos/admin/TroubleshootingPage.tsx` | Page component with operation cards |
| Create | `frontend/src/api/smartpos/admin.ts` | API function for WAC backfill call |

### Sidebar

One new item under the "Administration" subheader, placed after Backups:

```
Troubleshooting    IconBuild    /smartpos/admin/troubleshooting
```

No `minPlan` restriction — available to all admins.

### Route

```tsx
<Route path="admin/troubleshooting" element={<RequireAdmin><TroubleshootingPage /></RequireAdmin>} />
```

Wrapped in `RequireAdmin` — only users with the `admin` permission can access.

### Page component

`TroubleshootingPage.tsx`:

- **Header**: "Troubleshooting" title, subtitle "Administrative operations and data repairs"
- **Grid**: MUI `<Grid container spacing={2}>` with operation cards
- **Each card** uses MUI `<Card>` with:
  - Icon + title + description
  - **Run button**: text says "Run" when idle, shows `<CircularProgress>` when running, disabled during execution
  - **Result area** (conditionally rendered after execution):
    - Success: `<Alert severity="success">` with updated count
    - Info: `<Alert severity="info">` when nothing to do
    - Error: `<Alert severity="error">` with error message
  - **Footer**: "Last run: [timestamp]" (stored in component state)

**States per card:**
- `idle` — button enabled, no result shown
- `running` — button disabled with spinner, no result shown
- `success` — result shown, button re-enabled
- `error` — error shown, button re-enabled (re-runnable)

### First card: WAC Backfill

- **Title**: "Recalculate Product Costs"
- **Description**: "Seeds weighted average cost for existing stock from the most recent purchase costs. Run this if products are showing 0% or 100% margins on the dashboard."
- **API**: `POST /api/v1/sales/backfill-wac` — already exists in sales-service
- **API function**:
  ```typescript
  export async function runWacBackfill(): Promise<{updated: number; costsFound: number; message?: string}> {
    const { data } = await api.post('/api/v1/sales/backfill-wac');
    return data;
  }
  ```
- **Result display**:
  - `updated > 0`: green — "Updated N stock records with purchase costs (M cost entries found)"
  - `updated === 0 && costsFound === 0`: blue — "No purchase data found for this tenant — stock must be received first"
  - `updated === 0 && costsFound > 0`: blue — "All stock costs are already up to date"
  - Error: red — error message from server

### API module

`frontend/src/api/smartpos/admin.ts` — new file with:
- `runWacBackfill()` — calls `POST /api/v1/sales/backfill-wac`
- (Future operations add their API functions here)

### Extensibility

Adding a new troubleshooting operation:
1. Add the backend endpoint (if not already present)
2. Add an API function to `admin.ts`
3. Add a card object to the card array in `TroubleshootingPage.tsx`

No sidebar or route changes needed.

## Scope

Frontend-only change. The WAC backfill endpoint already exists. One new page, one new sidebar item, one new route.
