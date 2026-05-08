# Letis POS — Insights Hub & AI-Powered Reports

## Context

The current Reports module (`/smartpos/reports`) is a simple grid of 9 shortcut cards linking to individual report pages. Each report page renders KPIs, charts, and data tables using shared components. AI components (AiReportSummary, AiRecommendations, AiReportChat) exist but are basic collapsible cards — not visually integrated with the report data, and hidden behind a "Generate" button.

The goal: transform Reports into **Insights Hub** — an AI-first intelligence experience where summaries and recommendations are prominent, actionable, and always integrated with charts and data.

## Naming

- Module: **Insights** (sidebar, page title)
- Hub page: **Insights Hub** (`/smartpos/reports`)
- AI summary: **Executive Summary** (on each report)
- AI recommendations: **Smart Insights** (on each report + hub)
- Existing AI page: **Ask AI** (renamed from "AI Insights")

## Design Direction

**Refined Intelligence** — data-dense but scannable. AI content integrated inline, not hidden behind buttons. Charts chosen per data type. Mobile-first with responsive chart sizing.

## Hub Page: Insights Hub

Layout (top to bottom):
1. **PageHeader** — title "Insights", subtitle "AI-powered analysis from your business data"
2. **Business Pulse card** — prominent dark card at top showing live AI summary across all reports. Auto-generated from the current period's data. Shows: revenue trend, top category, critical alerts, margin health. Links to relevant detailed reports.
3. **Priority Actions** — 2-4 recommendation cards ordered by priority (HIGH → MEDIUM → LOW). Each card: priority badge + category badge + title + description + link to report. Tapping navigates to the relevant report with filters pre-set.
4. **Explore Reports** — compact grid of report shortcut cards (same 9 reports, smaller cards). Each card: icon + title + 1-line description.

## Individual Report Pages

Each report page follows a consistent shell with integrated AI panels:

### Section Flow

1. **Report Header** — PageHeader with title, date range subtitle, period selector, warehouse filter, Export + Generate AI buttons
2. **Executive Summary** (AI) — Prominent green-tinted strip/card at the top of every report. Always visible after generation. Contains: 3-5 sentence narrative summarizing the key numbers, trends, and anomalies. Includes a timestamp ("Generated 2 min ago"). Re-generate button to refresh.
3. **KPI Row** — 4-8 metric cards in a responsive grid. Each card: label, value, change indicator (↑/↓ %), mini sparkline. Horizontally scrollable on mobile.
4. **Charts Section** — 1-2 rows of charts. Chart type chosen per data type:
   - Time series → Line/area chart (revenue over time, order count over time)
   - Composition → Donut/treemap (category breakdown, payment mix)
   - Comparison → Horizontal bar chart (top products, top customers)
   - Ranking → Vertical bar chart (sales by category, purchases by supplier)
   - Distribution → Histogram (order value distribution)
5. **Smart Insights** (AI) — Grid of 2-4 recommendation cards. Each card: priority badge (HIGH/MEDIUM/LOW), category badge (INVENTORY/PRICING/SALES/COST/GENERAL), title, actionable description. Color-coded borders (red=high, yellow=medium, green=low).
6. **Data Table** — Sortable, filterable table with export. Uses existing DataTable component.

### Chart Type Rules

| Data | Chart | Reason |
|---|---|---|
| Revenue/time, Orders/time | Line chart (smooth, area fill) | Shows trend direction clearly |
| Category/product breakdown | Donut chart | Best for proportion/part-of-whole |
| Top N items ranking | Horizontal bar chart | Names readable, values comparable |
| Payment methods mix | Donut chart | Proportion of total |
| Expense categories | Treemap or donut | Relative size comparison |
| Gross vs Net comparison | Grouped bar chart | Side-by-side period comparison |
| Stock level distribution | Histogram | Distribution shape |
| Customer segments | Horizontal bar | Ranked spending |

## Shared Components to Upgrade

### ReportPageShell
- Add responsive container padding
- Add mobile bottom spacing for bottom nav

### ReportKpiRow
- Responsive grid: 4 cols desktop → 2 cols tablet → horizontal scroll mobile
- Each KPI card gets a mini sparkline rendered client-side
- Touch-friendly tap targets

### ReportChartCard
- Configurable chart type per use case
- Responsive height: taller on desktop, compact on mobile
- Consistent border radius + shadow treatment

### AiReportSummary → ExecutiveSummary
- Rename component
- Always-visible after generation (not collapsible by default)
- Green gradient background strip
- Timestamp + regenerate button
- Loading: subtle skeleton pulse
- Error: inline alert, not empty state

### AiRecommendations → SmartInsights
- Rename component
- Grid layout (3 cols desktop, 1 col mobile)
- Color-coded left border per priority
- Category + priority badges
- Link to relevant action (e.g., "View inventory →")
- Loading: 3 skeleton cards
- Empty: "Generate insights" button

### NEW: BusinessPulseCard (hub only)
- Dark gradient background (matches Refined Enterprise theme)
- Shows cross-report AI summary
- Links to specific reports
- Auto-generates on page load
- "LIVE" animated badge

## Technical Decisions

- **Charts**: Continue using ApexCharts (already in project). Consistent chart theme (font, colors, grid).
- **AI Integration**: Use existing `aiNarrate`, `aiGetRecommendations` API functions. Cache results per report+period to avoid re-fetching on re-render.
- **State**: AI results stored in component state. Re-generated when filters change (period, warehouse).
- **Performance**: AI calls are lazy — generated on explicit "Generate" click or on first page load. Chart data loads in parallel with AI calls.
- **Mobile**: All AI panels stack vertically on mobile. KPI row scrolls horizontally. Charts use reduced height.

## File Changes

```
Create:
  frontend/src/components/smartpos/reports/BusinessPulseCard.tsx
  frontend/src/components/smartpos/reports/ExecutiveSummary.tsx  (renamed from AiReportSummary)
  frontend/src/components/smartpos/reports/SmartInsights.tsx     (renamed from AiRecommendations)

Modify:
  frontend/src/views/smartpos/reports/ReportsHubPage.tsx         — redesign as Insights Hub
  frontend/src/views/smartpos/reports/SalesReportPage.tsx        — pattern example
  frontend/src/views/smartpos/reports/ProfitLossPage.tsx         — pattern example
  frontend/src/views/smartpos/reports/InventoryReportPage.tsx    — pattern example
  frontend/src/components/smartpos/reports/ReportKpiRow.tsx      — responsive upgrade
  frontend/src/components/smartpos/reports/ReportChartCard.tsx   — chart type config
  frontend/src/components/smartpos/reports/index.ts              — update exports

Keep (unchanged):
  frontend/src/views/smartpos/ai/AiInsightsPage.tsx              — rename page title to "Ask AI"
  All other report pages — inherit shared component upgrades
  All API functions — unchanged
```

## What We're NOT Doing

- Not building new backend endpoints
- Not changing the AI provider infrastructure
- Not modifying the DataTable component
- Not touching the async exports page
- Not changing the sidebar menu items (yet — can rename "Reports" to "Insights" later)
