# Dashboard Intelligence Upgrade — Design Spec

**Date**: 2026-05-17
**Status**: Design approved
**Scope**: Enhance existing Letis POS dashboard with intelligence, AI-driven insights, and actionable recommendations for East African SME merchants.

---

## Context

The dashboard UI already exists with 12 components (BusinessPulseCard, KpiGrid, RevenueChart, PaymentMixCard, RecentTransactions, FinancialHealth, OperationsOverview, TopPerformers, SideRail, AnomalyAlerts, GoalProgress, GreetingBar). The backend ai-service already has ForecastingService, FraudDetectionService, CustomerAnalyticsService, AnomalyService, RecommendationService, and InsightService — but none are wired to the dashboard.

**Rule**: Do NOT redesign or rewrite working components. Enhance what exists. Do NOT recommend features requiring data Letis POS cannot collect.

---

## Phase 1: Dashboard Section Audit & Enhancements

### 1. Business Pulse (Lead Card)

**Gap**: Shows only net profit/loss with a binary "profitable / losing money" message. No context on why, no forward-looking signal, no actionable headline.

**Enhancements**:
- Add a 1-line AI headline (e.g. "Sales up 12% — stock risk in 3 categories")
- Show the single most critical alert inline (low stock, expiring batch, AR aging)
- Tap-to-expand for the full AI Executive Summary

**Example insight**: "Profit up 8% this month. But Supplier X raised prices on 6 SKUs — your margin on those items dropped 4 points."

**Priority**: Critical
**Data required**: `Dashboard.netProfit`, `Dashboard.salesSeries`, `Anomaly[]`, supplier price change data
> ⚠ Requires: `purchase_line.unit_cost` history with supplier join — show placeholder until available.

---

### 2. KPI Cards

**Gap**: Six standalone metric cards with deltas but no threshold context. Revenue without margin context. Orders without average basket.

**Enhancements**:
- Add threshold coloring: green if margin > 20%, amber if 10-20%, red if < 10%
- Show average order value as sub-label under Orders (net / count)
- Add "vs. goal" progress dot on each card when goals are set
- Replace generic delta with contextual comparison (e.g. "12% below your monthly target")

**Example insight**: N/A — display enhancement only.

**Priority**: High
**Data required**: `Dashboard.sales`, `Dashboard.netProfit`, user goals (already in localStorage)

---

### 3. Today Needs Attention

**Gap**: Generic alert strip with 4 hardcoded messages. No prioritization, no specificity, no resolution path.

**Enhancements**:
- Rank alerts by financial impact (lost sales > expired stock > AR risk)
- Name specific items: "Maize Flour (50kg) — 2 bags left, sells 3/day"
- Add "Take Action" button on each alert (e.g., "Create PO" for stock-outs)
- Auto-dismiss acknowledged alerts

**Example insight**: "3 products will stock out within 2 days: Maize Flour (2 left), Cooking Oil (5 left), Sugar (8 left). Reorder now to avoid TSh 950,000 in lost sales."

**Priority**: Critical
**Data required**: `inventory.lowStockLines` (exists), sales velocity per product
> ⚠ Requires: daily sales by product for last 30 days with reorder points

---

### 4. Business Overview Charts

**Gap**: Revenue chart with optional forecast overlay. No margin trend, no prior period overlay, single dimension.

**Enhancements**:
- Add toggle: Revenue | Profit | Orders (reuse existing chart component)
- Overlay prior period as dashed line (data already fetched in `previousData`)
- Show forecast confidence band instead of raw point projection
- Add annotations for significant events (e.g. "Eid promo — +45% sales")

**Example insight**: N/A — visualization enhancement.

**Priority**: Medium
**Data required**: `Dashboard.salesSeries`, `previousData.salesSeries`, `Forecast` with confidence intervals
> ⚠ Requires: forecast confidence data (ForecastingService doesn't currently return confidence bands)

---

### 5. Recent Transactions

**Gap**: Flat table of 5 most recent sales. No anomaly flagging, no customer context, no unusual-pattern detection.

**Enhancements**:
- Highlight flagged transactions (fraud, unusual discount, after-hours) with icon and color
- Show customer name + visit count (e.g. "Jane D. — 3rd visit this month")
- Add "View All" linking to sales with current period pre-filtered
- Show average sale comparison: "↑ 22% above avg"

**Example insight**: "⚠ Sale #INV-0421 — TSh 1,200,000 — flagged: 10× average order value. Verify."

**Priority**: High
**Data required**: `Sale[]` with `grandTotal`, `customerId`, `confirmedAt` (exists), fraud flags
> ⚠ Requires: fraud detection integration into transaction feed

---

### 6. Top Performers

**Gap**: Three-tab list of products/customers/suppliers with revenue and percentage. No trend direction, no margin data, no recency context.

**Enhancements**:
- Add trend arrow per item (↑/→/↓ vs prior period)
- For products: show margin %, not just revenue
- For customers: show days since last visit + segment label (Loyal / At Risk / New)
- For suppliers: show on-time delivery % and price trend

**Example insight**: "Jane D. — your #1 customer — hasn't returned in 45 days. She spent TSh 2.4M last quarter. Send a re-engagement offer."

**Priority**: High
**Data required**: `TopPerformer[]` (exists), margin per product, customer last visit, supplier delivery
> ⚠ Requires: `product.cost` joined with sale price, `CustomerAnalyticsService` integration, purchase receipt vs expected delivery date

---

### 7. Financial Health

**Gap**: Four small stat cards (Expenses, Profit Margin, Sales Due, Purchases). No cash position, no AR aging, no tax liability estimate.

**Enhancements**:
- Add "Cash Position" — inflows vs outflows this period
- Add "AR Aging" — amount overdue by 30/60/90+ days with warning color
- Add "Tax Liability" — estimated tax due this period
- Replace static "Sales Due" with "Collectible Now" — due within terms vs overdue

**Example insight**: "⚠ TSh 4.2M in receivables overdue 30+ days. Top 3 debtors: Customer A (TSh 1.8M), Customer B (TSh 1.2M), Customer C (TSh 850K)."

**Priority**: High
**Data required**: `Dashboard.sales.due` (exists), `getArAging()` (exists, not wired), `getCashFlow()` (exists, not wired), tax estimate
> ⚠ Requires: `tax_summary` joined with current period sales

---

### 8. Operations Overview

**Gap**: Four small stat cards. No turnover metrics, no dead stock flag, no supplier performance.

**Enhancements**:
- Add "Inventory Turnover" — how many times stock turns per month
- Add "Dead Stock" — value of items unsold 90+ days with red flag
- Add "Pending POs" — purchase orders awaiting delivery with ETA
- Replace "Stock Movement" with "Fast Movers" — top 3 items by velocity

**Example insight**: "⚠ TSh 1,800,000 in dead stock — 23 items not sold in 90+ days. Consider clearance pricing or return to supplier."

**Priority**: Medium
**Data required**: `InventorySummary` (exists), `getDeadStock()` (exists, not wired), `getInventoryTurnover()` (exists, not wired), pending POs
> ⚠ Requires: purchase order status tracking

---

### 9. Payment Mix

**Gap**: Pie/donut chart of payment methods. No trend, no shift detection, no fee analysis for mobile money.

**Enhancements**:
- Add period-over-period shift detection (e.g. "Mobile money up 15% vs last month")
- Show estimated processing fees per method
- Flag unusual shifts (e.g. "Cash suddenly 60% of mix — normally 30%")
- Show average transaction value per payment method

**Example insight**: "⚠ Mobile money now 65% of payments (up from 48%). Your M-Pesa fees this month: approximately TSh 185,000."

**Priority**: Low
**Data required**: `PaymentMethodMixRow[]` (exists), fee rates per payment method, prior period mix
> ⚠ Requires: payment method fee configuration

---

### 10. Goal Progress

**Gap**: Three user-defined goals stored in localStorage. Not shared across users, no intelligent defaults, no pacing alert.

**Enhancements**:
- Move goals to server-side (per tenant, not per browser)
- Auto-suggest goals based on: prior period + 10% growth
- Add pacing alert: "You're at 62% of your monthly target with 10 days left — need TSh 380,000/day"
- Add streak tracking: "You've hit your daily orders target 12 days in a row"

**Example insight**: "You need TSh 380,000/day for the remaining 10 days to hit your TSh 15M monthly target. Current pace: TSh 412,000/day — you're on track."

**Priority**: Medium
**Data required**: Goals (needs server persistence), daily revenue/orders (exists in `salesSeries`), streak calculation (derived)
> ⚠ Requires: `tenant_goals` table in user-service

---

## Phase 1 (continued): New Module Designs

### 1. AI Executive Summary

**Gap**: No top-level synthesis. A merchant sees numbers but no narrative connecting them. InsightService exists but isn't wired to the dashboard.

**Enhancements**:
- Daily digest card at page top (above Business Pulse), collapsible
- 3-4 bullet narrative: (1) top-line result, (2) what changed, (3) what needs attention, (4) recommended action
- Each bullet links to the relevant section/report
- Regenerate on demand; cache daily

**Example insight**: "Yesterday you did TSh 1.2M in sales (↑8% vs last Tuesday). Maize Flour stock is critical — 2 bags left at Main Branch. Customer Jane D. hasn't returned in 45 days despite TSh 2.4M lifetime spend. Consider restocking Maize Flour today and sending Jane a 10% loyalty offer."

**Priority**: Critical
**Data required**: Dashboard KPIs, low-stock items with velocity, top customer recency, anomaly alerts — all already exist in backend but need aggregation

**API endpoint design**:
```
GET /api/v1/dashboard/executive-summary
Query: ?date=2026-05-17
Response: { summary, bullets: [{ text, severity, linkTo }], generatedAt, dataFreshness }
```

---

### 2. Profit Opportunities

**Gap**: No margin analysis at product level on the dashboard. Merchant doesn't know which items are underpriced or where to focus pricing.

**Enhancements**:
- "Underpriced Items" — above-median velocity but below-median margin
- "Margin Erosion" — supplier cost increased but sale price unchanged 30+ days
- "Bulk Pricing Gap" — high-volume customers without volume discounts
- "Category Comparison" — margin by category, flagging the weakest

**Example insight**: "Cooking Oil (5L): you sell 120 units/month at 8% margin. Average category margin is 18%. Raising price by TSh 500 would add TSh 60,000/month profit with minimal volume risk."

**Priority**: High
**Data required**: Product cost (exists), sale price (exists), category avg margin (derived), supplier price history
> ⚠ Requires: `purchase_line.unit_cost` with effective date tracking

**API endpoint design**:
```
GET /api/v1/dashboard/profit-opportunities
Query: ?warehouseId=uuid&limit=5
Response: { opportunities: [{ productId, name, currentMargin, suggestedPrice, estimatedMonthlyImpact, reason }], totalEstimatedImpact }
```

---

### 3. Demand Forecast (7-day and 30-day)

**Gap**: ForecastingService exists but outputs raw product-level projections without stock context, confidence bands, or revenue translation. Not wired to dashboard.

**Enhancements**:
- 7-day operational forecast: which products, how many units, estimated revenue
- 30-day strategic forecast: aggregate revenue projection with trend direction
- Stock adequacy check: for each forecasted item, compare projected demand vs current stock
- Confidence indicator: HIGH (>8 weeks data) / MEDIUM (4-8 weeks) / LOW (<4 weeks)

**Example insight**: "Next 7 days: forecast 340 units across 12 products (~TSh 4.2M). Maize Flour projected at 45 units — you have 2 in stock. Reorder 50 units by Wednesday to avoid stockout."

**Priority**: Critical
**Data required**: `ForecastingService` output (exists), current stock levels (exists), product prices (exists)

**API endpoint design**:
```
GET /api/v1/dashboard/demand-forecast?horizon=7|30
Query: ?warehouseId=uuid
Response: { forecast: [{ productId, name, projectedQty, projectedRevenue, currentStock, stockGap, confidence }], aggregateRevenue, dataStartDate, dataEndDate }
```

---

### 4. Auto-Reorder Recommendations

**Gap**: Low-stock alerts exist ("X items low") but no PO creation path, no supplier recommendation, no economic order quantity.

**Enhancements**:
- For each item below reorder point: suggest qty based on lead time demand + safety stock
- Recommend preferred supplier (last purchase price + delivery performance)
- Show "Cost of Inaction" — estimated lost sales if not reordered within lead time
- One-click "Create Purchase Order" button pre-filling the PO with recommended items

**Example insight**: "Reorder Maize Flour (50kg): 50 bags from Supplier A at TSh 45,000/bag. Total: TSh 2,250,000. If not reordered by Thursday, risk TSh 675,000 in lost sales over 5 days."

**Priority**: High
**Data required**: Stock levels (exists), reorder points, supplier pricing history (exists), sales velocity
> ⚠ Requires: product reorder point + lead time config

**API endpoint design**:
```
GET /api/v1/dashboard/reorder-recommendations
Query: ?warehouseId=uuid&limit=10
Response: { recommendations: [{ productId, name, currentStock, reorderPoint, recommendedQty, preferredSupplierId, preferredSupplierName, estimatedCost, costOfInaction, urgency }] }
```

---

### 5. Customer Retention Alerts

**Gap**: CustomerAnalyticsService provides RFM segmentation but isn't surfaced on dashboard. Merchant doesn't know which valuable customers are slipping away.

**Enhancements**:
- "At Risk" watchlist: top 5 customers by lifetime value who haven't returned in 30+ days
- "Lost" escalation: customers 90+ days absent with what they used to spend
- Churn probability indicator (heuristic: recency/frequency decay)
- One-click re-engagement: "Send SMS" or "Create Promotion" button linked to CRM

**Example insight**: "3 high-value customers at risk of churning: Jane D. (last visit 45 days ago, spent TSh 2.4M), John M. (38 days, TSh 1.8M), Ali K. (32 days, TSh 1.5M). Total at-risk revenue: TSh 5.7M."

**Priority**: Critical
**Data required**: `CustomerAnalyticsService` RFM data (exists), customer contact info
> ⚠ Requires: phone/email on customer record for re-engagement

**API endpoint design**:
```
GET /api/v1/dashboard/customer-retention-alerts
Query: ?limit=5
Response: { atRiskCustomers: [{ customerId, name, lastVisitDays, lifetimeValue, segment, churnProbability }], totalAtRiskRevenue, lostCustomers: [...] }
```

---

### 6. Fraud & Anomaly Detection

**Gap**: FraudDetectionService exists with 5 rule-based checks. AnomalyAlerts component calls a generic `/anomalies` endpoint returning statistical deviations — not the fraud-specific flagged transactions. These two alert streams are not unified.

**Enhancements**:
- Merge anomaly stats + fraud flags into a single alert feed ranked by risk score
- Show specific transaction details: ref #, amount, type, risk score, reason
- Add "Dismiss" / "Investigate" actions on each alert
- Daily summary: "3 transactions flagged this week, total value at risk: TSh 850,000"

**Example insight**: "⚠ High Risk: Sale #INV-0421 — TSh 1,200,000 at 03:14 AM with 60% discount. 10× average order value. User: cashier_04. Review immediately."

**Priority**: High
**Data required**: `FraudDetectionService` output (exists), `Anomaly[]` (exists), transaction details (exists via sales-service)

**API endpoint design**:
```
GET /api/v1/dashboard/fraud-alerts
Query: ?status=pending|all&limit=10
Response: { alerts: [{ transactionId, amount, type, riskScore, reasons[], detectedAt, status }], summary: { totalFlagged, totalValueAtRisk, highRiskCount } }
```

---

### 7. Cash Flow Forecast (30-day)

**Gap**: No forward-looking cash position. Merchant sees current cash in/out but has no visibility into whether they'll have enough cash to pay suppliers, staff, or bills in 2 weeks.

**Enhancements**:
- Project daily cash balance for next 30 days: recurring inflows (sales trend) + scheduled outflows (supplier payments due, payroll, rent)
- Highlight "danger days" — dates where projected balance drops below safety threshold
- Show "upcoming obligations": supplier invoices due, tax payments, recurring bills
- Scenario toggle: "If sales drop 20%" / "If 2 large customers pay late"

**Example insight**: "⚠ Your cash balance may drop to TSh 180,000 by May 25 — below your TSh 500,000 safety threshold. Cause: TSh 2.2M supplier payment due May 23 + payroll TSh 1.8M on May 25. Expected inflows by then: TSh 3.5M."

**Priority**: High
**Data required**: Current cash balance, AP aging (due dates on purchases), recurring expenses, sales trend (exists)
> ⚠ Requires: bank/cash account integration or manual cash position entry, expense schedule or manual input

**API endpoint design**:
```
GET /api/v1/dashboard/cash-flow-forecast
Query: ?days=30
Response: { dailyProjections: [{ date, openingBalance, inflows, outflows, closingBalance, isDangerDay }], upcomingObligations: [{ date, description, amount }], safetyThreshold, lowestBalance, lowestBalanceDate }
```

---

## Phase 1 Summary

| Section | Priority | New Data Needed? |
|---|---|---|
| 1. Business Pulse | Critical | Supplier price history |
| 2. KPI Cards | High | None |
| 3. Today Needs Attention | Critical | Sales velocity per product, reorder points |
| 4. Business Overview Charts | Medium | Forecast confidence bands |
| 5. Recent Transactions | High | Fraud integration |
| 6. Top Performers | High | Product cost, customer last visit, supplier delivery |
| 7. Financial Health | High | Tax estimate |
| 8. Operations Overview | Medium | Pending PO tracking |
| 9. Payment Mix | Low | Payment method fee config |
| 10. Goal Progress | Medium | Server-side goal storage |
| AI Executive Summary | Critical | None (aggregation only) |
| Profit Opportunities | High | Supplier price history, purchase cost tracking |
| Demand Forecast | Critical | None (wiring only) |
| Auto-Reorder | High | Reorder points, lead time config |
| Customer Retention Alerts | Critical | Customer contact info |
| Fraud & Anomaly Detection | High | None (wiring only) |
| Cash Flow Forecast | High | Cash position, AP aging, recurring expenses |

---

## Phase 2: Technical Spec

### 1. Backend Services

#### 1.1 Dashboard Aggregation (extend `report-service`)

**Decision**: Extend existing `report-service` rather than creating a new microservice. The data already flows through it. A new service adds network hops and deployment complexity without clear benefit at this scale.

**New controller**: `DashboardIntelligenceController` alongside existing `ReportController`.

**Responsibility**: Single entry point for all dashboard intelligence. Orchestrates calls to report-service internals, ai-service, inventory-service, sales-service, and payment-service. Owns caching, response assembly, and grace degradation.

**Caching TTL**: 5 minutes for KPI data, 30 minutes for trend data

**Key queries**:

```sql
-- Executive summary aggregation
SELECT
  (SELECT COALESCE(SUM(net), 0) FROM sales
   WHERE date = CURRENT_DATE AND status = 'CONFIRMED' AND tenant_id = :tenantId) AS today_revenue,
  (SELECT COALESCE(SUM(net), 0) FROM sales
   WHERE date = CURRENT_DATE - INTERVAL '7 days' AND status = 'CONFIRMED' AND tenant_id = :tenantId) AS last_week_same_day;

-- Profit opportunities: underpriced items (above-median velocity, below-median margin)
WITH product_metrics AS (
  SELECT p.id, p.name, p.sale_price, p.cost,
    COALESCE(SUM(sl.qty), 0) AS units_sold_30d,
    CASE WHEN p.sale_price > 0 THEN ((p.sale_price - p.cost) / p.sale_price) * 100 ELSE 0 END AS margin_pct
  FROM product p
  LEFT JOIN sale_line sl ON sl.product_id = p.id AND sl.created_at >= CURRENT_DATE - INTERVAL '30 days'
  WHERE p.active = true AND p.tenant_id = :tenantId
  GROUP BY p.id
),
medians AS (
  SELECT
    PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY units_sold_30d) AS median_velocity,
    PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY margin_pct) AS median_margin
  FROM product_metrics
)
SELECT * FROM product_metrics, medians
WHERE units_sold_30d > median_velocity AND margin_pct < median_margin * 0.7
ORDER BY units_sold_30d DESC LIMIT 5;

-- Customer retention: high-LTV customers with no purchase in 30-90 days
SELECT c.id, c.name, c.phone,
  MAX(s.date) AS last_purchase, COUNT(s.id) AS total_orders,
  COALESCE(SUM(s.net), 0) AS lifetime_value,
  CURRENT_DATE - MAX(s.date)::DATE AS days_since_last
FROM customer c
JOIN sale s ON s.customer_id = c.id AND s.tenant_id = :tenantId
WHERE s.status = 'CONFIRMED' AND s.date >= CURRENT_DATE - INTERVAL '365 days'
GROUP BY c.id
HAVING MAX(s.date) < CURRENT_DATE - INTERVAL '30 days'
   AND MAX(s.date) >= CURRENT_DATE - INTERVAL '90 days'
   AND COALESCE(SUM(s.net), 0) > (
     SELECT PERCENTILE_CONT(0.7) WITHIN GROUP (ORDER BY SUM(s2.net))
     FROM sale s2 WHERE s2.customer_id IS NOT NULL AND s2.tenant_id = :tenantId
     GROUP BY s2.customer_id
   )
ORDER BY lifetime_value DESC LIMIT 5;

-- Auto-reorder: items below reorder point with velocity
WITH daily_velocity AS (
  SELECT sl.product_id, COALESCE(SUM(sl.qty) / 30.0, 0) AS avg_daily_sales
  FROM sale_line sl
  JOIN sale s ON s.id = sl.sale_id
  WHERE s.tenant_id = :tenantId AND s.status = 'CONFIRMED'
    AND s.date >= CURRENT_DATE - INTERVAL '30 days'
  GROUP BY sl.product_id
)
SELECT p.id, p.name, p.code, i.on_hand, p.reorder_point, p.lead_time_days,
  dv.avg_daily_sales,
  ROUND((dv.avg_daily_sales * p.lead_time_days * 1.3) - i.on_hand) AS recommended_qty,
  ROUND(dv.avg_daily_sales * p.lead_time_days * p.sale_price) AS cost_of_inaction,
  (SELECT sp.supplier_id FROM supplier_product sp
   WHERE sp.product_id = p.id AND sp.is_preferred = true LIMIT 1) AS preferred_supplier_id
FROM product p
JOIN inventory i ON i.product_id = p.id
JOIN daily_velocity dv ON dv.product_id = p.id
WHERE p.tenant_id = :tenantId AND i.on_hand <= p.reorder_point
  AND p.active = true AND dv.avg_daily_sales > 0
ORDER BY (p.reorder_point - i.on_hand) * p.sale_price DESC LIMIT 10;

-- Cash flow projection: recursive daily balance over next 30 days
WITH RECURSIVE dates AS (
  SELECT CURRENT_DATE AS date
  UNION ALL SELECT date + 1 FROM dates WHERE date < CURRENT_DATE + INTERVAL '30 days'
),
daily_inflow AS (
  SELECT CURRENT_DATE + n AS date,
    COALESCE((SELECT AVG(net) FROM sale WHERE tenant_id = :tenantId
      AND date = CURRENT_DATE - INTERVAL '7 days' + n AND status = 'CONFIRMED'), 0) AS projected
  FROM generate_series(0, 29) n
),
daily_outflow AS (
  SELECT due_date AS date, COALESCE(SUM(due), 0) AS amount
  FROM purchase WHERE tenant_id = :tenantId AND status IN ('OPEN', 'PARTIALLY_PAID')
    AND due_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '30 days'
  GROUP BY due_date
)
SELECT d.date,
  :currentCashBalance
    + COALESCE(SUM(di.projected) OVER (ORDER BY d.date), 0)
    - COALESCE(SUM(do.amount) OVER (ORDER BY d.date), 0) AS projected_balance
FROM dates d
LEFT JOIN daily_inflow di ON di.date = d.date
LEFT JOIN daily_outflow do ON do.date = d.date
ORDER BY d.date;
```

#### 1.2 AI Orchestration (extend `ai-service`)

**New service**: `DashboardIntelligenceService` in existing `ai-service`.

```java
@Service
public class DashboardIntelligenceService {

    // Aggregates: sales summary + stock alerts + anomalies + retention → executive bullet points
    // Uses existing InsightService.salesTrend() under the hood
    // Falls back to rule-based template if LLM times out (>3s)
    public ExecutiveSummary generateExecutiveSummary(UUID tenantId, LocalDate date) { ... }

    // Wraps existing RecommendationService with structured dashboard input
    public List<ActionableRecommendation> generateRecommendations(UUID tenantId) { ... }

    // Unifies FraudDetectionService + AnomalyService output into ranked alert feed
    public UnifiedAlertFeed getUnifiedAlerts(UUID tenantId) { ... }
}
```

**Caching TTL**: 1 hour for executive summary (daily batch refresh), real-time for fraud alerts.

#### 1.3 Data Freshness Service (new, in `report-service`)

```sql
CREATE TABLE dashboard_data_freshness (
  source VARCHAR(64) PRIMARY KEY,  -- 'sales', 'inventory', 'payments', 'purchases', 'customers'
  last_updated_at TIMESTAMP NOT NULL,
  status VARCHAR(16) NOT NULL DEFAULT 'FRESH'  -- FRESH, STALE, ERROR
);
```

Each source service updates its row on write. Dashboard aggregation reads all rows and surfaces STALE/ERROR states in `meta.alerts[]`.

---

### 2. API Design

#### 2.1 Unified Response Envelope

Every dashboard intelligence endpoint returns:

```json
{
  "status": "ok" | "degraded" | "error",
  "data": { ... },
  "meta": {
    "generated_at": "2026-05-17T08:42:00+03:00",
    "data_freshness": {
      "sales": { "last_updated": "2026-05-17T08:40:12+03:00", "status": "FRESH" },
      "inventory": { "last_updated": "2026-05-17T07:15:00+03:00", "status": "FRESH" },
      "payments": { "last_updated": "2026-05-17T08:41:00+03:00", "status": "FRESH" },
      "customers": { "last_updated": "2026-05-17T06:00:00+03:00", "status": "STALE" }
    },
    "alerts": [
      { "level": "warning", "message": "Customer data is 2+ hours old — retention alerts may be incomplete." }
    ]
  }
}
```

**Status values**: `ok` (all sources FRESH), `degraded` (≥1 source STALE or sub-service returned fallback), `error` (critical failure).

#### 2.2 Existing Endpoints (reference — do not modify)

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/v1/reports/dashboard` | Core dashboard KPIs |
| GET | `/api/v1/reports/forecast` | Demand forecast |
| GET | `/api/v1/reports/anomalies` | Statistical anomalies |
| GET | `/api/v1/reports/top-products` | Top products V2 |
| GET | `/api/v1/reports/top-customers` | Top customers V2 |
| GET | `/api/v1/reports/top-suppliers` | Top suppliers V2 |
| GET | `/api/v1/payments/by-method` | Payment method mix |
| GET | `/api/v1/reports/customers/rfm` | RFM segmentation |
| GET | `/api/v1/reports/customers/retention` | Retention rate |
| GET | `/api/v1/reports/payments/aging` | AR aging |
| GET | `/api/v1/reports/dead-stock` | Dead stock |
| GET | `/api/v1/reports/inventory/turnover` | Inventory turnover |
| POST | `/api/v1/ai/insights/sales-trend` | LLM sales narrative |
| POST | `/api/v1/ai/recommendations` | LLM recommendations |

#### 2.3 New Endpoints

```
GET /api/v1/dashboard/executive-summary
  Query: ?date=2026-05-17
  Response: {
    summary: "string (2-3 sentence narrative)",
    bullets: [{ text, severity: "positive"|"neutral"|"warning"|"critical", linkTo }],
    generatedAt: "ISO"
  }

GET /api/v1/dashboard/profit-opportunities
  Query: ?warehouseId=uuid&limit=5
  Response: {
    opportunities: [{ productId, name, category, currentMargin, suggestedPrice, estimatedMonthlyImpact, reason }],
    totalEstimatedImpact: number
  }

GET /api/v1/dashboard/demand-forecast
  Query: ?horizon=7|30&warehouseId=uuid
  Response: {
    forecast: [{ productId, name, projectedQty, projectedRevenue, currentStock, stockGap, confidence }],
    aggregateRevenue: number,
    confidenceDistribution: { high: n, medium: n, low: n },
    dataStartDate, dataEndDate
  }

GET /api/v1/dashboard/reorder-recommendations
  Query: ?warehouseId=uuid&limit=10
  Response: {
    recommendations: [{ productId, name, currentStock, reorderPoint, recommendedQty,
      preferredSupplierId, preferredSupplierName, estimatedCost, costOfInaction, urgency }]
  }

GET /api/v1/dashboard/customer-retention-alerts
  Query: ?limit=5
  Response: {
    atRiskCustomers: [{ customerId, name, phone, lastVisitDays, lifetimeValue, segment, churnProbability }],
    totalAtRiskRevenue: number,
    lostCustomers: [{ customerId, name, lastVisitDays, lifetimeValue }]
  }

GET /api/v1/dashboard/fraud-alerts
  Query: ?status=pending|all&limit=10
  Response: {
    alerts: [{ transactionId, ref, amount, type, riskScore, reasons[], detectedAt, status }],
    summary: { totalFlagged, totalValueAtRisk, highRiskCount, criticalCount }
  }

GET /api/v1/dashboard/cash-flow-forecast
  Query: ?days=30
  Response: {
    dailyProjections: [{ date, openingBalance, inflows, outflows, closingBalance, isDangerDay }],
    upcomingObligations: [{ date, description, amount }],
    safetyThreshold: number,
    lowestBalance: number,
    lowestBalanceDate: "ISO"
  }
```

---

### 3. AI Recommendation Engine

#### 3.1 Rule-Based Triggers (deterministic, always available)

| Trigger | Condition | Alert |
|---------|-----------|-------|
| Low stock + high velocity | `on_hand ≤ reorder_point AND avg_daily_sales > 0` | "Reorder {product}: {qty} units to avoid {costOfInaction} in lost sales" |
| Margin erosion | `currentMargin < avgMargin × 0.7 AND velocity > median` | "Underpriced: {product} at {margin}% vs category avg {avgMargin}%" |
| Customer churn risk | `recencyDays > 45 AND lifetimeValue > p70` | "At risk: {customer} last visited {recencyDays} days ago — {lifetimeValue} lifetime spend" |
| AR aging critical | `overdue90Days > 0` | "{amount} overdue 90+ days — review collections for {topDebtor} and {n} others" |
| Cash flow danger | `projectedBalance < safetyThreshold within 14 days` | "Cash may drop to {lowestBalance} by {date} — {obligation} due" |
| High discount | `lineDiscount > lineTotal × 0.5` | "Flagged: sale #{ref} has >50% discount on {product}" |
| After-hours transaction | `transactionTime between 02:00-05:00` | "Flagged: sale #{ref} at {time} — unusual hour" |
| Rapid voids | `>3 voids by same user in 1 hour` | "Flagged: {n} voids by {user} in 1 hour" |
| Dead stock accumulation | `daysSinceLastSale > 90 AND onHand > 0 AND valuation > threshold` | "Dead stock: {product} — {valuation} tied up, not sold in {days} days" |
| Profit negative | `netProfit < 0` | "Your business lost {amount} this period — expenses exceed gross profit" |

#### 3.2 ML Hooks

Activated only when tenant has ≥ 90 days of transaction history AND ≥ 100 sales. Below that, fall back to rule-based.

| ML Capability | Algorithm | Input Features | Output |
|---------------|-----------|----------------|--------|
| Demand forecasting | Holt-Winters exponential smoothing | Daily sales × product × 90d, day-of-week seasonality | 7d/30d forecast with 80% confidence interval |
| Churn probability | Logistic regression | Recency, frequency decay rate, monetary, days since first purchase | Probability score 0-1 per customer |
| Anomaly detection | Isolation Forest (weekly batch) | Hourly revenue, transaction count, avg basket, void rate, discount rate | Anomaly scores with top-N flagged windows |
| Price elasticity | Linear regression | Weekly price changes vs weekly qty sold per product | Estimated volume impact of ±X% price change |
| Cash flow prediction | ARIMA | Daily net cash flow × 90d | 30-day daily projection with confidence bands |

**ML service**: New `MlPredictionService` in `ai-service`. Use Smile or Apache Commons Math (in-process JVM, no Python dependency). Models serialized to MinIO (already in stack). Weekly retrain Sunday 02:00 UTC.

#### 3.3 Fallback Behavior (sparse data: < 30 days or < 100 transactions)

| Module | Fallback | User-Facing Impact |
|--------|----------|-------------------|
| Executive Summary | Template: "You had {n} sales totaling {amount} today." No bullets. | Basic stats, no AI narrative |
| Demand Forecast | Simple moving average (existing ForecastingService) | Lower confidence label |
| Profit Opportunities | Category-average comparison only (no ML elasticity) | Fewer recommendations |
| Customer Retention | Simple 30/60/90-day recency buckets (no probability) | "At Risk" / "Lost" labels without churn % |
| Fraud Detection | Rule-based only (already implemented) | No degradation — rules are primary |
| Cash Flow Forecast | Linear projection from 7-day avg (no seasonality) | "Estimated" label, wider range |
| Auto-Reorder | Fixed `lead_time × avg_daily_sales × 1.5` (higher safety factor) | Slightly over-orders vs ML-optimized qty |

**Data sufficiency thresholds displayed in UI**:
- < 30 days: "Not enough history for accurate forecasts. More data improves predictions."
- 30–90 days: "Forecasts based on limited data — confidence may be low."
- > 90 days: Full ML capabilities, no warning shown.

---

### 4. Caching Strategy

#### 4.1 Cache Layers

```
Browser (React Query / SWR)
  - Executive summary: stale-while-revalidate, 5 min
  - KPIs: stale-while-revalidate, 1 min
  - Forecasts: stale-while-revalidate, 15 min
        │
Gateway (Spring Cloud Gateway — optional)
  - Response cache by tenantId + params
  - Cache-Control headers from downstream
        │
Service-level (Caffeine in-memory cache)
  - report-service: dashboard aggregates
  - ai-service: LLM prompt → response pairs
```

#### 4.2 Cache Tiers

| Tier | TTL | Data | Invalidation |
|------|-----|------|-------------|
| Real-time (< 30s) | 10s max | Fraud alerts, live transaction feed | New sale, void, payment |
| Short cache (5 min) | 300s | KPI cards, Business Pulse, Payment Mix, Anomaly alerts | Sale confirmed, payment received, stock adjusted |
| Medium cache (15 min) | 900s | Revenue charts, Top Performers, Financial Health, Operations | Period rollover or explicit refresh |
| Long cache (1 hr) | 3600s | Trend analysis, Profit Opportunities, Customer RFM segments | Hourly cron |
| Daily batch | 86400s | Executive Summary, Demand Forecast, Cash Flow Forecast, Auto-Reorder | 06:00 local time per tenant |

#### 4.3 Cache Key Strategy

```
cache key = service:endpoint:tenantId:paramsHash
Example: report:dashboard:tenant-abc:MONTH:warehouse-xyz
```

Use Spring Cache abstraction with Caffeine (in-memory). Redis can be added for multi-instance deployments later. Start with Caffeine only.

#### 4.4 Stale-While-Revalidate

For short-cache and medium-cache tiers:
1. Return cached response immediately
2. Asynchronously refresh from source
3. Next request gets fresh data

Ensures dashboard never shows loading spinner after initial load.

#### 4.5 Cache Warming

On application startup, pre-warm daily-batch caches for the 50 most active tenants (by sales volume in last 7 days).

---

### 5. Implementation Phasing

| Phase | Deliverable | Services Touched | Est. Effort |
|-------|-------------|-----------------|-------------|
| 2a | Wire existing AI services to dashboard: FraudDetection, CustomerAnalytics, Anomaly → new endpoints + frontend components | ai-service, report-service, frontend | 3-5 days |
| 2b | Build aggregation layer: DashboardIntelligenceController + unified envelope + data freshness tracking | report-service | 3-4 days |
| 2c | Executive Summary module: rule-based template + LLM upgrade path + frontend card | ai-service, frontend | 2-3 days |
| 2d | Profit Opportunities + Auto-Reorder + Demand Forecast (rule-based) | report-service, ai-service, frontend | 4-5 days |
| 2e | Customer Retention Alerts + Cash Flow Forecast (rule-based fallback) | ai-service, frontend | 3-4 days |
| 2f | ML models: Holt-Winters forecast, churn probability, anomaly detection | ai-service | 5-7 days |
| 2g | Caching layer + cache warming + grace degradation | report-service, ai-service, gateway | 2-3 days |
| 2h | Polish: pacing alerts on Goal Progress, threshold coloring on KPIs, AR aging on Financial Health | frontend | 2-3 days |

---

### 6. Key Design Decisions

1. **Do not replace** `/api/v1/reports/dashboard`. Add new endpoints alongside it. Frontend calls existing + new endpoints in parallel via `Promise.allSettled`.

2. **Rule-based before ML**. All 7 new modules work with rule-based logic from day one. ML models are a Phase 2f upgrade for tenants with sufficient history.

3. **Extend `report-service`** for dashboard aggregation rather than creating a new microservice. The data already flows through it.

4. **Extend `ai-service`** for intelligence orchestration. It already owns LLM calls, anomaly detection, fraud detection, and forecasting.

5. **Goals move to server**. Add `tenant_goals` table in user-service with CRUD API. Frontend falls back to localStorage for offline resilience.

6. **Fraud alerts are real-time**, everything else is eventually consistent. A flagged transaction needs to surface immediately; trend charts can tolerate 5-minute cache.

7. **Tone**: Every insight names the specific product, customer, supplier, or amount. Generic insights are forbidden. Messages read as a trusted advisor speaking to a busy merchant — not a chatbot, not a report.
