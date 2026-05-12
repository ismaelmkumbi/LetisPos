# Dashboard v2 — World-Class Enterprise Upgrade

## Scope
Transform the 1,509-line monolithic dashboard into a world-class enterprise dashboard with 9 new capabilities and a modular component architecture.

---

## 1. Architecture — Split into Components

Move from 1 file (DashboardPage.tsx, 1509 lines) to 16 files:

```
dashboard/
├── DashboardPage.tsx          (orchestrator, ~150 lines)
├── GreetingBar.tsx            (greeting + period pills + warehouse + refresh + customize)
├── KpiGrid.tsx                (4-6 metric cards with delta chips)
├── BusinessPulseCard.tsx      (net profit + sparkline)
├── RevenueChart.tsx           (business overview line chart + forecast overlay)
├── PaymentMixCard.tsx         (donut chart)
├── RecentTransactions.tsx     (latest 5 sales)
├── TopPerformers.tsx          (top 5 products/customers/suppliers, tabbed)
├── FinancialHealth.tsx        (4 small stats)
├── OperationsOverview.tsx     (4 small stats)
├── SideRail.tsx               (alerts + quick actions)
├── GoalProgress.tsx           (target tracking bars)
├── AnomalyAlerts.tsx          (unusual pattern alerts)
├── Skeleton.tsx               (loading)
├── EmptyPanel.tsx             (empty fallback)
└── types.ts                   (shared dashboard types)
```

DashboardPage only handles data fetching (Promise.allSettled), state, and layout composition. All sub-components are pure presentational.

---

## 2. Period-over-Period Deltas

Every KPI card shows a comparison chip:

```
+12.5% vs last month  [green]
-3.2% vs last week   [red]
```

Implementation: `useMemo` computes current vs previous period delta. For the Business Overview chart, render a secondary comparison line (dotted, muted).

---

## 3. Goal Tracking

New `GoalProgress` card in main grid. Users set targets:
- Monthly revenue target (number input)
- Daily orders target
- Profit margin target (%)

Stored in `localStorage` keyed by tenantId. Progress bars with actual vs target and % complete.

---

## 4. Auto-Refresh

`usePolling(fetchFn, intervalMs)` hook:
- Re-fetches every 60s
- Pauses when `document.visibilityState === 'hidden'`
- Resumes on `visibilitychange`
- Manual refresh button (IconRefresh) in greeting bar
- Shows subtle "Last updated: X seconds ago" indicator

---

## 5. Full Drill-Down

| Element | Navigates to |
|---------|-------------|
| Cash in Hand KPI | `/smartpos/money/accounts` |
| Net Sales KPI | `/smartpos/reports/sales` |
| Orders KPI | `/smartpos/sales` |
| Purchases KPI | `/smartpos/purchases` |
| Revenue chart data point | `/smartpos/reports/sales?date=...` |
| Recent transaction row | `/smartpos/sales/{id}` |
| Low stock alert | `/smartpos/stock?low=1` |
| Payment mix segment | `/smartpos/reports/payments` |
| Expiring stock alert | `/smartpos/stock?expiring=30` |

---

## 6. Revenue Forecast

**Backend:** `GET /api/v1/reports/forecast?period=MONTH&days=30&warehouseId=`
- Uses simple linear regression on the salesSeries data
- Returns array of projected values for next N days

**Frontend:** Forecast line rendered as dashed ApexCharts series on the Business Overview chart. Annotations for forecast start. Tooltip labels: "Projected: TSh X".

---

## 7. Top Performers

New card with 3 tabs: Top Products, Top Customers, Top Suppliers.

**Backend:** 
- `GET /api/v1/reports/top-products?period=&warehouseId=&limit=5` — by revenue
- `GET /api/v1/reports/top-customers?period=&warehouseId=&limit=5` — by spend
- `GET /api/v1/reports/top-suppliers?period=&warehouseId=&limit=5` — by purchase volume

**Frontend:** Horizontal bar chart per tab with rank, name, value, and % of total. Click navigates to detail.

---

## 8. Anomaly Alerts

**Backend:** `GET /api/v1/reports/anomalies?warehouseId=`
- Compares today's metrics against historical average for same day-of-week
- Returns anomalies where deviation > 2 standard deviations

**Frontend:** New `AnomalyAlerts` section in SideRail. Shows up to 3 anomaly cards with icon, description, and "Investigate" link. Examples:
- "Sales 40% below average Tuesday"
- "Expense spike: TSh 150,000 above normal"
- "Unusually low foot traffic today"

---

## 9. User Customization

"Customize" icon button in greeting bar → opens dialog with:
- Draggable list of dashboard sections
- Toggle switches to show/hide each section
- "Reset to default" button

Preferences stored in `localStorage` keyed by `dashboard:layout:{tenantId}`.

---

## 10. Mobile Optimization

| Breakpoint | Behavior |
|------------|----------|
| <600px | Cards stack vertically, metric cards become compact 2-column chips, charts reduce to 200px height, side rail becomes bottom sheet accessible via floating FAB, period pills scroll horizontally |

---

## Backend Summary

| Endpoint | Service |
|----------|---------|
| `GET /api/v1/reports/forecast` | report-service |
| `GET /api/v1/reports/top-products` | report-service |
| `GET /api/v1/reports/top-customers` | report-service |
| `GET /api/v1/reports/top-suppliers` | report-service |
| `GET /api/v1/reports/anomalies` | report-service |

## Implementation Order

1. Split into components (no behavior change)
2. Add period-over-period deltas
3. Add drill-down links
4. Add auto-refresh
5. Add goal tracking
6. Add forecast
7. Add top performers
8. Add anomaly alerts
9. Add customization
10. Mobile optimization
