# Dashboard v2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans.

**Goal:** Transform the 1,509-line dashboard monolith into a world-class enterprise dashboard with 9 new capabilities, split into 16 component files.

**Architecture:** DashboardPage becomes a thin orchestrator (~150 lines) that fetches data and composes sub-components. Each sub-component is pure presentational. New backend endpoints for forecast, top performers, and anomalies in report-service.

**Tech Stack:** React 19 / MUI 6 / React Router 7 / ApexCharts (frontend), Java 21 / Spring Boot 3 (backend).

---

## Phase 1: Split Monolith into Components

### Task 1.1: Extract all sub-components from DashboardPage.tsx

Create these files from the existing dashboard code (copy-paste, no behavior changes):

1. `src/views/smartpos/dashboard/GreetingBar.tsx` — `DashboardGreetingBar` function
2. `src/views/smartpos/dashboard/BusinessPulseCard.tsx` — `BusinessPulseCard` function
3. `src/views/smartpos/dashboard/KpiGrid.tsx` — the 4 `MetricCard` components
4. `src/views/smartpos/dashboard/RevenueChart.tsx` — Business Overview line chart
5. `src/views/smartpos/dashboard/PaymentMixCard.tsx` — donut chart
6. `src/views/smartpos/dashboard/RecentTransactions.tsx` — `RecentTransactions` function
7. `src/views/smartpos/dashboard/FinancialHealth.tsx` — 4 SmallStat cards
8. `src/views/smartpos/dashboard/OperationsOverview.tsx` — 4 SmallStat cards
9. `src/views/smartpos/dashboard/SideRail.tsx` — `DashboardSideRail` function
10. `src/views/smartpos/dashboard/Skeleton.tsx` — `DashboardSkeleton`
11. `src/views/smartpos/dashboard/EmptyPanel.tsx` — `EmptyPanel` function
12. `src/views/smartpos/dashboard/types.ts` — shared types (Trend, etc.)

DashboardPage.tsx becomes a thin orchestrator that imports and composes these components. Same props, same behavior — just decomposed.

**Commit:** `refactor: split dashboard monolith into 12 component files`

---

## Phase 2: Period-over-Period Deltas

### Task 2.1: Add delta computation + UI

- Add `previousPeriod` fetch in DashboardPage (fetch data for the previous matching period alongside current)
- Compute delta: `((current - previous) / previous) * 100` per metric
- Pass `delta` prop to each KPI card
- Render delta chip: green up-arrow for positive, red down-arrow for negative, with percentage
- Show in MetricCard, SmallStat, and BusinessPulseCard
- Revenue chart: render dotted comparison line for previous period

---

## Phase 3: Drill-Down + Auto-Refresh + Goals

### Task 3.1: Add drill-down links to every card

- `onClick` handler on each KPI card → navigate to relevant filtered page
- Chart data points: use ApexCharts `chart.events.dataPointSelection` to navigate

### Task 3.2: Add auto-refresh with usePolling hook

- Create `src/hooks/usePolling.ts` — re-fetches callback every 60s, pauses when tab hidden
- Add manual refresh button (IconRefresh) in GreetingBar
- Show "Last updated Xs ago" indicator

### Task 3.3: Add goal tracking

- Create `GoalProgress.tsx` — target inputs (revenue, orders, margin), progress bars
- Store targets in localStorage keyed by tenantId
- Show in main grid

---

## Phase 4: Forecast + Top Performers + Anomalies (backend + frontend)

### Task 4.1: Backend endpoints in report-service

- `ForecastController`: `GET /api/v1/reports/forecast` — linear regression on sales series, returns projected values
- `TopPerformersService`: 3 endpoints — top products, top customers, top suppliers by revenue/spend
- `AnomalyService`: `GET /api/v1/reports/anomalies` — compares current vs historical, flags >2σ deviations

### Task 4.2: Frontend — Forecast overlay

- `ForecastOverlay.tsx` — dashed ApexCharts series + annotations on RevenueChart

### Task 4.3: Frontend — Top Performers

- `TopPerformers.tsx` — 3 tabs (Products/Customers/Suppliers), horizontal bar chart, click to detail

### Task 4.4: Frontend — Anomaly Alerts

- `AnomalyAlerts.tsx` in SideRail — up to 3 anomaly cards with severity icons

---

## Phase 5: Customization + Mobile

### Task 5.1: Dashboard customization

- "Customize" gear icon → drag-and-drop reorder dialog
- Toggle switches to show/hide sections
- Store layout in localStorage

### Task 5.2: Mobile optimization

- Responsive breakpoints: <600px stack cards, compact chips, 200px charts, bottom sheet side rail

---

## Final Verification

- `npx tsc --noEmit` — clean
- `mvn compile` — clean
- All existing dashboard functionality preserved
