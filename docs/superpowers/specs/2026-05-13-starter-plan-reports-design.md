# STARTER Plan Reports — Design Spec

**Date:** 2026-05-13
**Status:** Approved

## Summary

Lower 3 report pages from BUSINESS to STARTER tier: Sales, Inventory, and Profit & Loss. STARTER users get full report pages in-app but no PDF/XLSX/CSV export (export stays BUSINESS+). This converts STARTER from zero reports to having the 3 operational reports every small shop needs daily.

## Motivation

STARTER is the first paid tier after trial (TZS 15K/mo, 2 users, 1 store, 500 products). Currently it has zero reports — only a dashboard with KPI cards. This creates a poor trial-to-paid conversion experience: after a month of sales, the owner can't see what sold, what's in stock, or whether they made money without upgrading to BUSINESS at 2.5x the price.

The 3 reports chosen are retention drivers, not upgrade drivers:
- **Sales** — "what did I sell today?"
- **Inventory** — "what do I need to reorder?"
- **Profit & Loss** — "am I making money?"

The natural upgrade trigger to BUSINESS becomes: tax filing, purchase tracking, financial statements, and exporting reports for an accountant.

## Design

### Frontend changes

**Router.tsx (lines 657-660)** — Change `minPlan` from `BUSINESS` to `STARTER` for 4 routes:

| Route | Change |
|---|---|
| `reports` (Reports Hub) | `minPlan="BUSINESS"` → `minPlan="STARTER"` |
| `reports/sales` | `minPlan="BUSINESS"` → `minPlan="STARTER"` |
| `reports/profit-loss` | `minPlan="BUSINESS"` → `minPlan="STARTER"` |
| `reports/inventory` | `minPlan="BUSINESS"` → `minPlan="STARTER"` |

The other 12 report routes remain `minPlan="BUSINESS"`.

**ReportExportBar.tsx** — Add plan check at component top:

```typescript
import { useAuth } from 'src/context/smartpos/AuthContext';

// Inside component:
const { hasPlan } = useAuth();
if (!hasPlan('BUSINESS')) return null;
```

`hasPlan` is already exported from `AuthContext`. This hides PDF/XLSX/CSV export buttons for STARTER users. BUSINESS+ unchanged.

### Backend (no changes)

`FeatureGateFilter.java` REPORT_GATES already correctly gated:
- `/api/v1/reports/sales/*`, `/api/v1/reports/inventory/*`, `/api/v1/reports/profit-loss` — no gate (accessible to all)
- `/api/v1/reports/export` — gated to BUSINESS

Backend enforcement is already correct. Frontend hiding is UI hygiene.

### User experience

**STARTER user:**
- Reports Hub accessible with 3 active cards (Sales, Inventory, P&L) and 13 locked cards
- Each unlocked report page fully functional: KPIs, charts, filters, data tables
- No export buttons on any report page
- Locked report pages show the existing "requires BUSINESS plan" screen with upgrade CTA

**BUSINESS+ user:**
- No changes. All 16 reports, full export functionality.

## Files changed

| File | Type |
|---|---|
| `frontend/src/routes/Router.tsx` | 4-line PlanGate change |
| `frontend/src/components/smartpos/reports/ReportExportBar.tsx` | Add plan check, early return |

## Testing

Manual verification:
1. STARTER user: Reports Hub loads with 3 accessible cards
2. STARTER user: Sales, Inventory, P&L pages load fully, no export buttons
3. STARTER user: Tax, Purchases, etc. show BUSINESS lock screen
4. BUSINESS user: No regression — all reports and exports work
5. STARTER user: Direct export API call returns 402/403
