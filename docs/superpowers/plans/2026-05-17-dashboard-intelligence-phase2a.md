# Dashboard Intelligence Upgrade — Phase 2a Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wire existing backend AI services (FraudDetectionService, CustomerAnalyticsService) into the dashboard UI so merchants see fraud alerts, customer retention risks, and AI-powered customer segments without any new backend endpoints.

**Architecture:** The backend ai-service already exposes `/api/v1/ai/fraud-detection` and `/api/v1/ai/customer-analytics`. The frontend API layer (`ai.ts`) already has typed functions `getFraudAlerts()` and `getCustomerAnalytics()`. This phase only touches the frontend — adding parallel data fetching in DashboardPage and threading the data into existing components (RecentTransactions, TopPerformers, SideRail). No new backend code.

**Tech Stack:** React 19 + TypeScript + MUI 7 + ApexCharts

---

## File Structure

```
frontend/src/
├── api/smartpos/ai.ts                          [MODIFY] add re-export types used by dashboard
├── views/smartpos/dashboard/
│   ├── DashboardPage.tsx                       [MODIFY] add AI data fetching + error handling
│   ├── RecentTransactions.tsx                  [MODIFY] add fraud flag indicators
│   ├── TopPerformers.tsx                       [MODIFY] add customer segment labels
│   ├── SideRail.tsx                            [MODIFY] add retention alert strip
│   └── types.ts                                [MODIFY] add AlertStrip fraud tone variant
```

---

### Task 1: Add fraud flag indicators to RecentTransactions

**Files:**
- Modify: `frontend/src/views/smartpos/dashboard/RecentTransactions.tsx`
- Modify: `frontend/src/views/smartpos/dashboard/types.ts`

**Goal:** Show a colored chip next to any recent sale that appears in the fraud alerts list, with tooltip showing the fraud reason.

- [ ] **Step 1: Add fraud tone to AlertStripProps in types.ts**

Open `frontend/src/views/smartpos/dashboard/types.ts` and add `'fraud'` to the `tone` union used by AlertStrip.

```typescript
// In types.ts, find the AlertStripProps interface and update the tone type.
// The current definition likely has: tone: 'success' | 'warning' | 'error'
// Add 'fraud' to the union:
export interface AlertStripProps {
  tone: 'success' | 'warning' | 'error' | 'fraud';
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  to: string;
}
```

- [ ] **Step 2: Verify the file saves without TypeScript errors**

Run: `cd frontend && npx tsc --noEmit --pretty 2>&1 | head -30`
Expected: No new errors related to `types.ts`.

- [ ] **Step 3: Modify RecentTransactions to accept and display fraud alerts**

Read `frontend/src/views/smartpos/dashboard/RecentTransactions.tsx`, then replace it with a version that accepts an optional `fraudAlertIds` set and renders a red chip on matching rows.

```typescript
// Full replacement of RecentTransactions.tsx:

import {
  Box,
  Card,
  CardContent,
  Chip,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
} from '@mui/material';
import { IconAlertTriangle, IconArrowUpRight } from '@tabler/icons-react';
import { useNavigate } from 'react-router';
import { useContext } from 'react';
import { CustomizerContext } from 'src/context/CustomizerContext';
import { brand } from 'src/theme/smartpos/brand';
import { formatMoney } from 'src/utils/smartpos/currency';
import { cardSx, titleColor, muted } from './utils';
import EmptyPanel from './EmptyPanel';
import type { Sale } from 'src/api/smartpos/sales';

interface RecentTransactionsProps {
  rows: Sale[];
  fraudAlertIds?: Set<string>;       // transaction refs or IDs flagged by FraudDetectionService
  fraudReasons?: Map<string, string>; // transaction ref → top fraud reason
}

function statusChip(status: string) {
  const map: Record<string, { bg: string; color: string; label: string }> = {
    CONFIRMED: { bg: '#ECFDF5', color: brand.primary[600], label: 'Paid' },
    PENDING: { bg: '#FFFBEB', color: brand.warning.main, label: 'Pending' },
    CANCELLED: { bg: '#FEF2F2', color: brand.error.main, label: 'Void' },
  };
  const s = map[status] ?? { bg: brand.neutral[100], color: brand.neutral[600], label: status };
  return (
    <Chip
      label={s.label}
      size="small"
      sx={{
        height: 20, fontSize: 10, fontWeight: 700, borderRadius: '4px',
        bgcolor: s.bg, color: s.color,
        '& .MuiChip-label': { px: 0.875 },
      }}
    />
  );
}

export default function RecentTransactions({ rows, fraudAlertIds, fraudReasons }: RecentTransactionsProps) {
  const { activeMode: _am } = useContext(CustomizerContext);
  const isDark = _am === 'dark';
  const navigate = useNavigate();

  const safeRows = rows ?? [];

  return (
    <Card elevation={0} sx={{ ...cardSx(isDark), height: '100%' }}>
      <CardContent sx={{ p: 2, height: '100%', display: 'flex', flexDirection: 'column' }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }}>
          <Typography sx={{ fontWeight: 800, color: titleColor, fontSize: 18 }}>
            Recent Transactions
          </Typography>
          <Chip
            label="View All"
            size="small"
            component="a"
            href="/smartpos/sales"
            clickable
            sx={{
              height: 24, fontSize: 11, fontWeight: 600, borderRadius: '6px',
              bgcolor: brand.primary[50], color: brand.primary[700],
              '&:hover': { bgcolor: brand.primary[100] },
            }}
          />
        </Stack>

        {safeRows.length === 0 ? (
          <EmptyPanel
            title="No recent transactions"
            subtitle="Your confirmed sales will appear here."
            height={240}
            compact
          />
        ) : (
          <TableContainer sx={{ flex: 1, '&::-webkit-scrollbar': { width: 4 } }}>
            <Table size="small" stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700, fontSize: 11, color: muted(isDark), py: 0.75 }}>
                    Sale
                  </TableCell>
                  <TableCell sx={{ fontWeight: 700, fontSize: 11, color: muted(isDark), py: 0.75 }}>
                    Customer
                  </TableCell>
                  <TableCell sx={{ fontWeight: 700, fontSize: 11, color: muted(isDark), py: 0.75 }}>
                    Status
                  </TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700, fontSize: 11, color: muted(isDark), py: 0.75 }}>
                    Amount
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {safeRows.slice(0, 6).map((row) => {
                  const ref = (row as any).ref as string | undefined;
                  const isFlagged = !!(ref && fraudAlertIds?.has(ref));
                  const reason = ref ? fraudReasons?.get(ref) : undefined;

                  return (
                    <TableRow
                      key={row.id}
                      hover
                      onClick={() => navigate(`/smartpos/sales/${row.id}`)}
                      sx={{
                        cursor: 'pointer',
                        bgcolor: isFlagged ? '#FEF2F2' : 'transparent',
                        '&:hover': { bgcolor: isFlagged ? '#FEE2E2' : brand.neutral[50] },
                        '&:last-child td': { border: 0 },
                      }}
                    >
                      <TableCell sx={{ py: 0.75 }}>
                        <Stack direction="row" spacing={0.75} alignItems="center">
                          <Typography sx={{ fontWeight: 700, fontSize: 12, color: titleColor }}>
                            {(row as any).ref ?? row.id?.slice(0, 8)}
                          </Typography>
                          {isFlagged && (
                            <Tooltip title={reason ?? 'Flagged by fraud detection'} arrow>
                              <IconAlertTriangle size={14} color={brand.error.main} />
                            </Tooltip>
                          )}
                        </Stack>
                        <Typography sx={{ fontSize: 10, color: muted(isDark) }}>
                          {new Date((row as any).date ?? row.createdAt).toLocaleDateString()}
                        </Typography>
                      </TableCell>
                      <TableCell sx={{ py: 0.75 }}>
                        <Typography sx={{ fontSize: 12, fontWeight: 600, color: titleColor }}>
                          {(row as any).customerName ?? 'Walk-in'}
                        </Typography>
                      </TableCell>
                      <TableCell sx={{ py: 0.75 }}>
                        {statusChip(row.status)}
                      </TableCell>
                      <TableCell align="right" sx={{ py: 0.75 }}>
                        <Typography sx={{ fontWeight: 800, fontSize: 12, color: titleColor }}>
                          {formatMoney((row as any).grandTotal ?? 0)}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 4: Check TypeScript compilation**

Run: `cd frontend && npx tsc --noEmit --pretty 2>&1 | grep -E "RecentTransactions|error TS" | head -20`
Expected: No errors from RecentTransactions.tsx.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/views/smartpos/dashboard/types.ts \
        frontend/src/views/smartpos/dashboard/RecentTransactions.tsx
git commit -m "feat: add fraud flag indicators to RecentTransactions"
```

---

### Task 2: Add customer segment labels to TopPerformers

**Files:**
- Modify: `frontend/src/views/smartpos/dashboard/TopPerformers.tsx`

**Goal:** When viewing the "Customers" tab, show segment badges (Loyal / At Risk / New / Lost) next to customer names, sourced from the CustomerAnalyticsService.

- [ ] **Step 1: Modify TopPerformers to accept customer segments**

Read `frontend/src/views/smartpos/dashboard/TopPerformers.tsx`. We'll add an optional `customerSegments` prop and render a small colored badge next to customer names.

Add this import at the top:

```typescript
import type { TopCustomer } from 'src/api/smartpos/ai';
```

Add the new prop to the interface:

```typescript
interface TopPerformersProps {
  period: Period;
  warehouseId: UUID | '';
  limit?: number;
  customerSegments?: Map<string, TopCustomer>;  // customerId → segment info
}
```

In the `PerformerRow` component, add a segment badge. Modify the name display section (around line 80-90 in the current file):

```typescript
// Inside PerformerRow, after the name Typography, add:
{segmentInfo && (
  <Chip
    label={segmentInfo.segment}
    size="small"
    sx={{
      height: 18, fontSize: 10, fontWeight: 700, borderRadius: '4px',
      bgcolor: segmentColor(segmentInfo.segment),
      color: '#fff',
      ml: 1,
      '& .MuiChip-label': { px: 0.75 },
    }}
  />
)}
```

Add helper functions at module scope:

```typescript
function segmentColor(segment: string): string {
  const map: Record<string, string> = {
    'Loyal': '#16a34a',
    'At Risk': '#f59e0b',
    'Lost': '#dc2626',
    'New': '#3b82f6',
  };
  return map[segment] ?? brand.neutral[400];
}
```

Update the `PerformerRow` props to include `segmentInfo`:

```typescript
function PerformerRow({
  rank,
  performer,
  valueLabel,
  onClick,
  isDark,
  segmentInfo,
}: {
  rank: number;
  performer: TopPerformer;
  valueLabel: string;
  onClick: () => void;
  isDark: boolean;
  segmentInfo?: TopCustomer;
}) { ... }
```

In the main `TopPerformers` function, look up segment info when rendering customer rows:

```typescript
// In the mapping of currentList, before the PerformerRow call:
const seg = tab === 'customers' && customerSegments
  ? customerSegments.get(item.id)
  : undefined;

// Pass it to PerformerRow:
<PerformerRow
  key={item.id}
  rank={idx + 1}
  performer={item}
  valueLabel={formatValue(item.value)}
  onClick={() => handleRowClick(item)}
  isDark={isDark}
  segmentInfo={seg}
/>
```

- [ ] **Step 2: Check TypeScript compilation**

Run: `cd frontend && npx tsc --noEmit --pretty 2>&1 | grep -E "TopPerformers|error TS" | head -20`
Expected: No errors from TopPerformers.tsx.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/views/smartpos/dashboard/TopPerformers.tsx
git commit -m "feat: add customer segment badges to TopPerformers"
```

---

### Task 3: Add customer retention alert to SideRail

**Files:**
- Modify: `frontend/src/views/smartpos/dashboard/SideRail.tsx`

**Goal:** Add a new AlertStrip in the "Today needs attention" section when high-value customers are at risk of churning.

- [ ] **Step 1: Add retention alert props to SideRail**

Add the new props to the `DashboardSideRailProps` interface (around line 68 in current file):

```typescript
interface DashboardSideRailProps {
  data: Dashboard | null;
  revenueTrend: Trend | null;
  isDark: boolean;
  paymentTotal: number;
  expiringBatchesCount: number;
  expiringUnitsAtRisk: number;
  anomalySlot?: React.ReactNode;
  atRiskCustomerCount?: number;       // NEW
  atRiskRevenue?: number;             // NEW
  totalAtRiskCustomers?: number;      // NEW — for the alert subtitle
}
```

Destructure the new props in the function signature:

```typescript
export default function DashboardSideRail({
  data, revenueTrend, isDark, paymentTotal,
  expiringBatchesCount, expiringUnitsAtRisk, anomalySlot,
  atRiskCustomerCount = 0, atRiskRevenue = 0, totalAtRiskCustomers = 0,
}: DashboardSideRailProps) {
```

- [ ] **Step 2: Add retention AlertStrip in "Today needs attention"**

After the expiring batches AlertStrip (around line 117 in current file), insert the retention alert:

```typescript
{atRiskCustomerCount > 0 && (
  <AlertStrip
    tone="warning"
    icon={<IconAlertTriangle size={22} />}
    title={`${atRiskCustomerCount} high-value customer${atRiskCustomerCount !== 1 ? 's' : ''} at risk`}
    subtitle={`TSh ${formatNumber(atRiskRevenue)} in lifetime value may churn — ${totalAtRiskCustomers} total`}
    to="/smartpos/customers?segment=at-risk"
  />
)}
```

Add the missing import for `formatNumber` at the top (it should already be imported; verify with grep). If not present:

```typescript
import { formatMoney, formatNumber } from 'src/utils/smartpos/currency';
```

- [ ] **Step 3: Check TypeScript compilation**

Run: `cd frontend && npx tsc --noEmit --pretty 2>&1 | grep -E "SideRail|error TS" | head -20`
Expected: No errors from SideRail.tsx.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/views/smartpos/dashboard/SideRail.tsx
git commit -m "feat: add customer retention alert strip to SideRail"
```

---

### Task 4: Wire AI data fetching into DashboardPage

**Files:**
- Modify: `frontend/src/views/smartpos/dashboard/DashboardPage.tsx`

**Goal:** Add parallel calls to `getFraudAlerts()` and `getCustomerAnalytics()` in the existing `fetchDashboardData` callback. Store the results in state and pass them down to child components.

- [ ] **Step 1: Add imports to DashboardPage**

Add to the existing imports (after line 16):

```typescript
import { getFraudAlerts, getCustomerAnalytics, type FlaggedTransaction, type CustomerAnalytics } from 'src/api/smartpos/ai';
```

- [ ] **Step 2: Add state variables**

Add state after the existing `forecast` state (around line 71):

```typescript
const [fraudAlerts, setFraudAlerts] = useState<FlaggedTransaction[]>([]);
const [customerAnalytics, setCustomerAnalytics] = useState<CustomerAnalytics | null>(null);
const [fraudUnavailable, setFraudUnavailable] = useState(false);
const [analyticsUnavailable, setAnalyticsUnavailable] = useState(false);
```

- [ ] **Step 3: Add AI data calls to fetchDashboardData**

In the `Promise.allSettled` array (after the existing 6 calls, around line 158), add two more calls:

```typescript
getFraudAlerts(),
getCustomerAnalytics(),
```

Update the results handling (after results[5] handling, around line 191):

```typescript
// results[6] = fraud alerts
if (results[6].status === 'fulfilled') {
  setFraudAlerts(results[6].value);
  setFraudUnavailable(false);
} else {
  setFraudAlerts([]);
  setFraudUnavailable(true);
}

// results[7] = customer analytics
if (results[7].status === 'fulfilled') {
  setCustomerAnalytics(results[7].value);
  setAnalyticsUnavailable(false);
} else {
  setCustomerAnalytics(null);
  setAnalyticsUnavailable(true);
}
```

- [ ] **Step 4: Build derived data for child components**

Add memoized derived values after the existing `useMemo` blocks (after line 296):

```typescript
// Build fraud alert lookup maps for RecentTransactions
const fraudAlertIdSet = useMemo(() => {
  return new Set(fraudAlerts.map((f) => f.transactionId));
}, [fraudAlerts]);

const fraudReasonMap = useMemo(() => {
  const map = new Map<string, string>();
  fraudAlerts.forEach((f) => {
    map.set(f.transactionId, f.type);
  });
  return map;
}, [fraudAlerts]);

// Build customer segment lookup for TopPerformers
const customerSegmentMap = useMemo(() => {
  if (!customerAnalytics?.topCustomers) return undefined;
  const map = new Map<string, typeof customerAnalytics.topCustomers[number]>();
  customerAnalytics.topCustomers.forEach((c) => map.set(c.id, c));
  return map;
}, [customerAnalytics]);

// Compute at-risk customer counts for SideRail
const atRiskStats = useMemo(() => {
  if (!customerAnalytics?.segments) return { count: 0, revenue: 0, totalAtRisk: 0 };
  const atRisk = customerAnalytics.segments.find((s) => s.label === 'At Risk');
  const lost = customerAnalytics.segments.find((s) => s.label === 'Lost');
  const totalAtRisk = (atRisk?.count ?? 0) + (lost?.count ?? 0);
  const atRiskRevenue = customerAnalytics.topCustomers
    ?.filter((c) => c.segment === 'At Risk' || c.segment === 'Lost')
    .reduce((sum, c) => sum + c.totalSpent, 0) ?? 0;
  const highValueAtRisk = customerAnalytics.topCustomers
    ?.filter((c) => c.segment === 'At Risk' || c.segment === 'Lost')
    .length ?? 0;
  return { count: highValueAtRisk, revenue: atRiskRevenue, totalAtRisk };
}, [customerAnalytics]);
```

- [ ] **Step 5: Pass new props to child components**

In the JSX, find the `<RecentTransactions>` usage (around line 474) and add the new props:

```tsx
<RecentTransactions
  rows={recentSales}
  fraudAlertIds={fraudAlertIdSet}
  fraudReasons={fraudReasonMap}
/>
```

Find the `<TopPerformers>` usage (around line 483) and add:

```tsx
<TopPerformers
  period={period}
  warehouseId={warehouseId}
  limit={5}
  customerSegments={customerSegmentMap}
/>
```

Find the `<DashboardSideRail>` usage (around line 544) and add:

```tsx
<DashboardSideRail
  data={data}
  revenueTrend={revenueTrend}
  isDark={isDark}
  paymentTotal={paymentTotal}
  expiringBatchesCount={expiringBatchesCount}
  expiringUnitsAtRisk={expiringUnitsAtRisk}
  anomalySlot={...}
  atRiskCustomerCount={atRiskStats.count}
  atRiskRevenue={atRiskStats.revenue}
  totalAtRiskCustomers={atRiskStats.totalAtRisk}
/>
```

- [ ] **Step 6: Check TypeScript compilation**

Run: `cd frontend && npx tsc --noEmit --pretty 2>&1 | head -40`
Expected: No errors. If there are type mismatches, fix them before proceeding.

- [ ] **Step 7: Run the dev server and verify the dashboard renders**

Run: `cd frontend && npm run dev`
Open the dashboard in a browser. Verify:
- No blank white screen (JS error)
- Recent Transactions table shows with/without fraud flags
- Top Performers → Customers tab shows segment badges
- SideRail shows retention alert if any at-risk customers exist

- [ ] **Step 8: Commit**

```bash
git add frontend/src/views/smartpos/dashboard/DashboardPage.tsx
git commit -m "feat: wire AI fraud detection and customer analytics into dashboard"
```

---

### Task 5: Grace degradation for unavailable AI services

**Files:**
- Modify: `frontend/src/views/smartpos/dashboard/DashboardPage.tsx`

**Goal:** If the ai-service is down or returns errors, the dashboard must still render fully — just without the AI-powered features. No error banners for optional AI data.

- [ ] **Step 1: Verify AI fetch failures don't break the dashboard**

The `Promise.allSettled` pattern already handles this — rejected promises don't throw. Verify that `fraudUnavailable` and `analyticsUnavailable` are set but never used to display an error banner (the existing `sectionError` state only tracks recent sales failures).

Check the `sectionError` logic (around line 193):

```typescript
const failedSections = [
  results[3].status === 'rejected' ? 'recent sales' : null,
].filter(Boolean);
```

Confirm that fraud/analytics rejections are NOT added to `failedSections`. They should silently degrade. If they're not being added (which they shouldn't be based on current code), this step is verification-only.

- [ ] **Step 2: Verify empty-state handling in child components**

Each child component already returns sensible output for missing data:
- `RecentTransactions`: `fraudAlertIds` is optional, defaults to empty Set
- `TopPerformers`: `customerSegments` is optional, defaults to undefined (no badges)
- `SideRail`: `atRiskCustomerCount` defaults to 0 (alert not rendered)

Run: `cd frontend && npx tsc --noEmit --pretty 2>&1 | head -20`
Expected: No errors.

- [ ] **Step 3: Manual test with ai-service down**

If possible, stop the ai-service container and reload the dashboard. Confirm:
- Dashboard renders fully with all core sections
- Recent Transactions shows no fraud flags
- Top Performers shows no segment badges on Customers tab
- SideRail shows no retention alert
- No error banner is shown

If you can't stop the service, verify by reading the code path — the `Promise.allSettled` guarantees `.status === 'rejected'` is handled in each branch.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/views/smartpos/dashboard/DashboardPage.tsx
git commit -m "fix: ensure dashboard degrades gracefully when AI services are unavailable"
```

---

### Task 6: End-to-end verification

**Files:** None (verification only)

**Goal:** Confirm the full flow works — from backend AI services through to dashboard rendering.

- [ ] **Step 1: Start all backend services**

```bash
cd backend && docker-compose up -d
```

Wait for all services to report healthy.

- [ ] **Step 2: Verify AI endpoints respond**

```bash
# Get a valid JWT from auth-service first, then:
curl -s -H "Authorization: Bearer $TOKEN" \
  http://localhost:8091/api/v1/ai/fraud-detection | jq 'length'
# Expected: a number (0 or more)

curl -s -H "Authorization: Bearer $TOKEN" \
  http://localhost:8091/api/v1/ai/customer-analytics | jq '.totalCustomers'
# Expected: a number (0 or more)
```

- [ ] **Step 3: Start frontend and open dashboard**

```bash
cd frontend && npm run dev
```

Open `http://localhost:5173/smartpos/dashboard` and verify:
1. Page loads without JavaScript errors (check browser console)
2. Revenue chart, KPIs, Business Pulse render as before
3. Recent Transactions table shows (fraud flags appear if any flagged transactions exist)
4. Top Performers → Customers tab shows segment badges (if customer analytics returned data)
5. SideRail retention alert appears if at-risk customers exist
6. Anomaly alerts section renders as before

- [ ] **Step 4: Verify TypeScript build**

```bash
cd frontend && npx tsc --noEmit
```
Expected: Clean exit with no errors.

- [ ] **Step 5: Commit any final fixes**

Only if changes were needed during verification.

---

## Implementation Order

Tasks must be executed sequentially — each task depends on the prop interfaces defined in the previous one:

1. **Task 1** — Add fraud flags to RecentTransactions (establishes the `fraudAlertIds` / `fraudReasons` prop pattern)
2. **Task 2** — Add customer segments to TopPerformers (establishes the `customerSegments` prop pattern)
3. **Task 3** — Add retention alert to SideRail (establishes the `atRiskCustomerCount` / `atRiskRevenue` props)
4. **Task 4** — Wire AI data fetching in DashboardPage (connects all the new props to real data)
5. **Task 5** — Grace degradation (verification pass on error handling)
6. **Task 6** — End-to-end verification

## Rollback Plan

Each task is an independent commit. If any task breaks the dashboard:
- `git revert <commit>` for the offending task
- Dashboard reverts to its pre-AI state (all core KPIs, charts, and basic alerts continue working)

## What This Phase Does NOT Do

- Does NOT create new backend endpoints (all AI data comes from existing `/api/v1/ai/*` routes)
- Does NOT modify the AI service Java code
- Does NOT add LLM-powered executive summaries (that's Phase 2c)
- Does NOT add demand forecast to the dashboard beyond the existing chart overlay (that's Phase 2d)
- Does NOT add auto-reorder recommendations (that's Phase 2d)
- Does NOT add profit opportunity detection (that's Phase 2d)
- Does NOT modify caching behavior (that's Phase 2g)
