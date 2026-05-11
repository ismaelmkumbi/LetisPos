# Enterprise Reporting Module — Design Spec

**Date:** 2026-05-11
**Status:** Approved

## Overview

Transform the existing Reports module from a collection of thin summary pages into an enterprise-grade reporting platform covering 8 business categories, with document-service integration for branded PDF output, scheduled delivery, comparative analysis, and drill-down.

## Current State

| Report | Backend | Frontend | Assessment |
|--------|---------|----------|------------|
| Sales | Full summary, top products/customers, by dimension | KPIs, charts, tables, AI | Strong — needs hourly, employee, voids |
| Profit & Loss | P&L calculation | Bar chart + AI | Solid |
| Tax | By rate, by category | Tables | Adequate — needs filing summary |
| Purchase | Summary + top suppliers | Basic tables | Thin |
| Payment | Summary + by-method | Chart + tables | Thin |
| Inventory | Summary + Feign calls | Basic | Thin |
| Customer | Summary + frequency | KPIs + table (52 lines) | Very thin |
| Advanced | Warranty, dead stock, valuation, dimension | Full page | Solid |
| Export Center | Sync + async, 3 formats | Full UI with polling | Strong |
| Employee | Endpoint returns empty list | No page | Broken |
| Supplier | None | Marked "soon" | Missing |
| Financial | Only P&L exists | Marked "soon" | Missing |
| Operations | None | None | Missing |

## Architecture

All work extends the existing report-service and frontend report pages. No new microservices.

```
report-service (extend)
├── api/
│   ├── ReportController.java          ← add new endpoints
│   ├── ExportController.java          ← extend for new report keys
│   └── ReportDashboardController.java ← NEW: saved views CRUD
├── application/
│   ├── SupplierReportService.java     ← NEW
│   ├── FinancialReportService.java    ← NEW
│   ├── EmployeeReportService.java     ← NEW (fix stub)
│   ├── OperationsReportService.java   ← NEW
│   ├── ReportScheduler.java           ← NEW
│   └── [deepen existing services]
├── domain/
│   ├── ReportDashboard.java           ← NEW: saved views
│   └── ScheduledReport.java           ← NEW
└── infrastructure/feign/
    ├── SupplierFeign.java             ← NEW
    └── HrmFeign.java                  ← NEW

frontend/src/views/smartpos/reports/
├── SalesReportPage.tsx           ← deepen
├── CustomerReportPage.tsx        ← deepen
├── PurchaseReportPage.tsx        ← deepen
├── PaymentReportPage.tsx         ← deepen
├── TaxReportPage.tsx             ← deepen
├── InventoryReportPage.tsx       ← deepen
├── ProfitLossPage.tsx            ← keep
├── SupplierReportPage.tsx        ← NEW
├── FinancialReportPage.tsx       ← NEW
├── EmployeeReportPage.tsx        ← NEW
├── OperationsReportPage.tsx      ← NEW
└── ReportBuilderPage.tsx         ← NEW
```

All pages reuse existing 12 shared report components (ReportPageShell, ReportFilterBar, ReportKpiRow, ReportChartCard, ReportDataTable, ReportExportBar, AI components).

## Data Flow

### Screen View (JSON + React)
```
Browser → GET /api/v1/reports/{type} → report-service
  → Feign → sales/inventory/payment/product-service
  → aggregate → return JSON
  → React renders KPI cards, ApexCharts, DataTable
```

### Print/Export via Document Service
```
Browser → Export/Print
  → POST /api/v1/documents/generate → document-service
    → Feign fetch report data from report-service
    → Handlebars template (branded: logo, fonts, footer)
    → Gotenberg HTML → PDF
    → Store in MinIO
    → Return presigned URL / download
```

Key: Screen stays fast (JSON), print is professional (document-service pipeline).

## Phase 1: Deepen Existing Reports

### Sales Report
Add: sales by hour heatmap, sales by terminal, employee sales chart, discount/void KPIs, avg transaction value trend, comparative period selector (this month vs last month)

### Customer Report
Add: RFM segmentation (Champions, Loyal, At Risk, Lost), retention rate vs prior period, new vs returning customer chart, customer lifetime value estimate, purchase frequency distribution chart

### Purchase Report
Add: purchases by category donut chart, supplier spend trend line, goods received vs ordered comparison, purchase return rate, average lead time

### Payment Report
Add: AR aging buckets (0-30, 31-60, 61-90, 90+ days), cash flow waterfall chart, payment method trend over time, outstanding receivables trend

### Tax Report
Add: monthly tax payable schedule, filing-ready summary with tax periods, taxable vs exempt breakdown, tax collected by terminal/warehouse

### Inventory Report
Add: stock turnover ratio per product, top/bottom movers table, batch/expiry timeline, valuation trend over time, stock days on hand

## Phase 2: New Report Types

### Supplier Report (NEW)
- Performance scorecard: on-time delivery %, quality rating, return rate
- Spend by supplier bar chart
- Purchase history table per supplier
- Running ledger with debits/credits
- Supplier payment aging
- Backend: SupplierReportService + SupplierFeign

### Financial Report (NEW)
- 3-tab layout: Balance Sheet, Trial Balance, Cash Flow Statement
- Pulls from chart_of_accounts, journal_entries, ledger via payment-service Feign
- Period-over-period comparison columns
- Export as branded PDF (document-service integration)
- Backend: FinancialReportService extends existing ProfitLossService

### Employee Report (NEW)
- Sales by employee bar chart
- Commission earned calculation
- Shift count and avg transaction value
- Top employees leaderboard
- Performance over time trend
- Backend: EmployeeReportService + HrmFeign

### Operations Report (NEW)
- Register summary by terminal (open/close amounts, cash count)
- Shift report with sales, refunds, voids
- Daily close summary
- Order fulfillment rate
- Backend: OperationsReportService using existing Feign clients

## Phase 3: Enterprise Features

### Document Service Integration
- All reports can render through document-service for professional PDF
- 8 Handlebars templates (one per report category) with Letis POS branding
- Templates include: logo, report title, date range, KPI summary header, data tables, charts as embedded images, page numbers, footer with generation timestamp
- DocumentActionsBar on every report page for one-click PDF/print

### Scheduled Delivery
- Cron-based scheduling: configure report type, recipients, frequency
- Daily: sales summary, operations report
- Weekly: profit & loss, inventory status
- Monthly: tax summary, financial statements
- Email delivery via notification-service
- Backend: ReportScheduler + ScheduledReport entity

### Comparative Periods
- Every KPI card shows delta vs prior period (↑12% / ↓5%)
- Green/red indicators with absolute and percentage change
- Prior period auto-calculated based on current period length
- Backend: add comparative period parameter to summary endpoints

### Drill-Down
- Click bar in "Sales by Category" chart → filtered DataTable showing products in that category
- Click KPI card → navigate to detail view with applied filters
- Click supplier row → supplier detail page with purchase history
- Frontend: onClick handlers on KPI/ChartCard/DataTable rows

### Custom Dashboards
- ReportBuilderPage: drag KPI cards, charts, and tables into a custom layout
- Save as named view ("My Monday Morning Report")
- Share with team members
- Backend: ReportDashboardController + ReportDashboard entity (JSON layout + filters)

### Menu Updates
In SmartPosMenuItems.ts, replace "soon" chips:
- Financial Reports → `/smartpos/reports/financial`
- Supplier Reports → `/smartpos/reports/suppliers`
- Employee Reports → `/smartpos/reports/employees`

Add:
- Operations Report → `/smartpos/reports/operations`
- Report Builder → `/smartpos/reports/builder`

## Document Templates (8 new)

For document-service integration, add Handlebars templates:
1. `report-sales.hbs` — revenue charts, top products, employee breakdown
2. `report-financial.hbs` — Balance Sheet, P&L, Cash Flow tables with account hierarchy
3. `report-inventory.hbs` — stock levels, valuation, turnover, expiry timeline
4. `report-customer.hbs` — RFM grid, retention chart, top customers
5. `report-supplier.hbs` — performance cards, spend chart, ledger
6. `report-tax.hbs` — tax by rate/category, filing summary, period breakdown
7. `report-employee.hbs` — leaderboard, commission, performance over time
8. `report-operations.hbs` — register summary, shift report, daily close

## Testing

- **Backend:** @WebMvcTest for controllers, unit tests for services, integration tests for Feign clients
- **Frontend:** Each report page renders with mock data, filter changes trigger correct API calls, comparative period delta displays correctly
- **Document Service:** Template rendering tests with sample data, PDF generation tests, MinIO upload tests
