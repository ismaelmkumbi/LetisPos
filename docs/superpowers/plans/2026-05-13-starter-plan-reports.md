# STARTER Plan Reports Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Lower Sales, Inventory, and Profit & Loss reports from BUSINESS to STARTER tier with full pages but no export.

**Architecture:** Two-file change following existing PlanGate pattern. Router.tsx gates loosen from BUSINESS to STARTER for 4 routes. ReportExportBar.tsx adds a plan check via the existing `hasPlan()` helper to hide export buttons on STARTER. Backend already correctly gated — no changes needed.

**Tech Stack:** React, TypeScript, MUI, existing AuthContext/PlanGate infrastructure

---

### Task 1: Lower report route gates to STARTER

**Files:**
- Modify: `frontend/src/routes/Router.tsx:650-653`

- [ ] **Step 1: Change 4 PlanGate minPlan values from BUSINESS to STARTER**

```typescript
// Router.tsx lines 650-653 — change minPlan from "BUSINESS" to "STARTER"
{ path: 'reports', element: <PlanGate minPlan="STARTER" featureName="Reports Hub"><SmartPosReportsHub /></PlanGate> },
{ path: 'reports/sales', element: <PlanGate minPlan="STARTER" featureName="Sales Reports"><SmartPosSalesReport /></PlanGate> },
{ path: 'reports/profit-loss', element: <PlanGate minPlan="STARTER" featureName="Profit & Loss"><SmartPosProfitLoss /></PlanGate> },
{ path: 'reports/inventory', element: <PlanGate minPlan="STARTER" featureName="Inventory Reports"><SmartPosInventoryReport /></PlanGate> },
```

Lines 654-664 (Tax, Purchases, Payments, Customers, Suppliers, Financial, Employees, Operations, Schedules, Builder, Exports) stay `minPlan="BUSINESS"`.

- [ ] **Step 2: Verify TypeScript compiles**

Run: `cd frontend && npx tsc --noEmit --pretty 2>&1 | head -20`
Expected: No new errors.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/routes/Router.tsx
git commit -m "feat: lower Sales, Inventory, P&L report gates from BUSINESS to STARTER"
```

---

### Task 2: Hide export bar on STARTER plan

**Files:**
- Modify: `frontend/src/components/smartpos/reports/ReportExportBar.tsx:1,21`

- [ ] **Step 1: Add useAuth import and plan check**

In `ReportExportBar.tsx`, add the `useAuth` import alongside existing imports:

```typescript
import { useAuth } from 'src/context/smartpos/AuthContext';
```

Then add the plan check at the top of the component body, right after the existing `useState` declarations (after line 23):

```typescript
const { hasPlan } = useAuth();
if (!hasPlan('BUSINESS')) return null;
```

The full component head should look like:

```typescript
export default function ReportExportBar({ reportKey, dateFrom, dateTo, warehouseId }: Props) {
  const [exporting, setExporting] = useState<ExportFormat | null>(null);
  const [job, setJob] = useState<ExportJob | null>(null);
  const { hasPlan } = useAuth();
  if (!hasPlan('BUSINESS')) return null;

  const handleExport = async (format: ExportFormat) => {
    // ... rest unchanged
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `cd frontend && npx tsc --noEmit --pretty 2>&1 | head -20`
Expected: No new errors.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/smartpos/reports/ReportExportBar.tsx
git commit -m "feat: hide report export bar on STARTER plan"
```
