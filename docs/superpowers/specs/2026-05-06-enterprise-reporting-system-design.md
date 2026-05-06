# Enterprise Reporting System — Design Spec

Date: 2026-05-06
Status: approved

## Overview

Build a full enterprise-grade reporting system across backend and frontend. The
existing report-service has solid API coverage (dashboard, sales summary, top
products/customers, inventory, P&L, warranty, dead stock, valuation, sales by
dimension, async exports). The frontend has a dashboard, an async export page,
and an advanced-reports page with 4 table tabs.

The gap: no dedicated interactive report pages where users explore data with
filters, charts, drill-downs, AI narratives, and export.

## Architecture

Individual routable report pages + shared component library. Each report gets
its own route and page. Shared components (filter bar, KPI cards, charts,
tables, export toolbar, AI panels) ensure consistency across pages.

### Backend — report-service additions

Six new endpoints on the existing `ReportController`:

| Endpoint | Purpose |
|---|---|
| `GET /reports/tax-summary` | Tax collected by period, category, tax rate |
| `GET /reports/purchases/summary` | Purchase trends, top suppliers |
| `GET /reports/payments/summary` | Payment analytics, collections vs outstanding |
| `GET /reports/payments/by-method` | Payment breakdown by method over time |
| `GET /reports/customers/summary` | Customer spend, frequency, retention |
| `GET /reports/sales/by-employee` | Sales attributed to employees |

New services:
- `TaxReportService` — queries fact_product_sales_daily for tax aggregation
- `PurchaseReportService` — purchase trends + top-suppliers query
- `PaymentReportService` — payment analytics via PaymentFeign
- `CustomerReportService` — customer analytics via SalesFeign + fact tables

New DTOs: `TaxSummaryDto`, `PurchaseSummaryDto`, `PaymentSummaryDto`,
`CustomerSummaryDto`, `EmployeeSalesDto`.

### Backend — ai-service additions

Three new endpoints on a new `ReportAiController`:

| Endpoint | Purpose |
|---|---|
| `POST /ai/reports/anomalies` | Detect outliers in report data via LLM |
| `POST /ai/reports/recommendations` | Generate actionable suggestions from report data |
| `POST /ai/reports/narrate` | Already exists (InsightService.narrate) — reused directly |

New services:
- `AnomalyService` — sends report data to LLM, returns flagged outliers with severity
- `RecommendationService` — sends report data to LLM, returns 3-5 concrete actions

### Frontend — pages

Eight new pages, two existing pages kept:

| Route | Page | Content |
|---|---|---|
| `/smartpos/reports` | ReportsHubPage | Landing cards linking to all report types |
| `/smartpos/reports/sales` | SalesReportPage | Revenue trend, KPIs, top products/customers, by category/brand/employee, payment mix |
| `/smartpos/reports/profit-loss` | ProfitLossPage | Revenue, COGS, gross profit, expenses, net profit with trends |
| `/smartpos/reports/inventory` | InventoryReportPage | Stock levels, valuation, low stock, movements |
| `/smartpos/reports/tax` | TaxReportPage | Tax by period chart, by category, by rate |
| `/smartpos/reports/purchases` | PurchaseReportPage | Purchase trends, top suppliers, by category |
| `/smartpos/reports/payments` | PaymentReportPage | Payment trends, method mix, collections vs outstanding |
| `/smartpos/reports/customers` | CustomerReportPage | Top customers, purchase frequency, new vs returning |
| `/smartpos/reports/advanced` | AdvancedReportsPage | (existing) Warranty, dead stock, valuation, sales by dimension |
| `/smartpos/reports/exports` | ReportsPage | (existing, renamed) Async export job submission + download |

### Frontend — shared components

In `src/components/smartpos/reports/`:

| Component | Purpose |
|---|---|
| `ReportPageShell` | Consistent page layout: header, filter bar, content slots, export bar |
| `ReportFilterBar` | Date range picker, warehouse selector, period selector, dimension selector |
| `ReportKpiRow` | Horizontal row of KPI metric cards with sparklines and anomaly badges |
| `ReportChartCard` | Card-wrapped ApexCharts (line, bar, area, donut, pie) with consistent styling |
| `ReportDataTable` | Sortable, paginated MUI table with search input |
| `ReportExportBar` | PDF / XLSX / CSV buttons wired to async export job API |

### Frontend — AI components

| Component | Purpose |
|---|---|
| `AiReportSummary` | AI-generated narrative card on each report page (calls narrate endpoint) |
| `AiAnomalyBadge` | Highlights unusual metrics on KPI cards and table rows |
| `AiReportChat` | Floating "Ask AI" button opening contextual chat panel pre-loaded with report data |
| `AiRecommendations` | Action-suggestion cards on dashboard and report pages |

### Report page layout

Every report page follows this structure:

```
ReportPageShell
  └─ ReportFilterBar (date range, warehouse, period, etc.)
  └─ AiReportSummary (AI narrative — collapsible)
  └─ AiRecommendations (action suggestions — collapsible)
  └─ ReportKpiRow (metric cards + sparklines + anomaly badges)
  └─ ReportChartCard (main chart — line/bar/donut)
  └─ ReportDataTable (sortable, paginated, searchable)
  └─ ReportExportBar (PDF | XLSX | CSV)
  └─ AiReportChat (floating action button)
```

### Router changes

Add 8 routes under `/smartpos/reports/*`. Update sidebar "Insight" section
with links to Sales, P&L, Inventory, Tax, Purchases, Payments, Customers,
Advanced, and Exports.

### API layer

Extend `frontend/src/api/smartpos/reports.ts` with types and functions for
all new backend endpoints. Add AI report functions in
`frontend/src/api/smartpos/ai.ts`.

## What stays unchanged

- Existing backend controllers, services, DTOs — extended, not rewritten
- Existing DashboardPage — add AI recommendations card only
- Existing AdvancedReportsPage — add export/print to each tab
- Existing ReportsPage (async exports) — renamed route only
- Existing AiInsightsPage — unchanged
- All existing report-service Kafka consumers, Redis caching, MinIO storage
- All existing AI service providers, router, invocation tracking

## Implementation order

1. Backend: new report-service endpoints + DTOs + services
2. Backend: new ai-service endpoints + services
3. Frontend: shared component library (ReportPageShell, ReportFilterBar, etc.)
4. Frontend: AI components (AiReportSummary, AiAnomalyBadge, AiReportChat, AiRecommendations)
5. Frontend: ReportsHubPage
6. Frontend: SalesReportPage + ProfitLossPage
7. Frontend: InventoryReportPage + TaxReportPage
8. Frontend: PurchaseReportPage + PaymentReportPage + CustomerReportPage
9. Frontend: update Router + sidebar
10. Frontend: extend API layer with new types/functions
11. Integration: wire AI components into all report pages and dashboard
