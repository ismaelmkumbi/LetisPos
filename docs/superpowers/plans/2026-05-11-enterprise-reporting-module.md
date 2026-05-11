# Enterprise Reporting Module — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform the Reports module into an enterprise-grade platform covering 8 business categories with document-service integration, comparative periods, drill-down, scheduled delivery, and custom dashboards.

**Architecture:** Extend existing report-service with new services/endpoints for Supplier, Financial, Employee, Operations reports. Deepen 6 existing report pages with additional KPIs, charts, and data tables. Add 5 enterprise features leveraging document-service for branded PDF, notification-service for scheduled delivery, and a new ReportDashboard entity for saved views.

**Tech Stack:** Java 21, Spring Boot 3, JPA/Hibernate, PostgreSQL, Redis, ApexCharts (React), Handlebars (document-service), Gotenberg (PDF), MinIO (storage)

---

## Phase 1: Deepen Existing Reports

### Task 1.1: Backend — Add deepened report endpoints

**Files:**
- Modify: `backend/report-service/src/main/java/io/smartpos/report/api/ReportController.java`
- Modify: `backend/report-service/src/main/java/io/smartpos/report/application/SalesReportService.java`
- Modify: `backend/report-service/src/main/java/io/smartpos/report/application/CustomerReportService.java`
- Modify: `backend/report-service/src/main/java/io/smartpos/report/application/PurchaseReportService.java`
- Modify: `backend/report-service/src/main/java/io/smartpos/report/application/PaymentReportService.java`
- Modify: `backend/report-service/src/main/java/io/smartpos/report/application/TaxReportService.java`
- Modify: `backend/report-service/src/main/java/io/smartpos/report/application/InventoryReportService.java`

Add these endpoints to ReportController.java:

```java
// Sales — add hourly breakdown
@GetMapping("/sales/by-hour")
@PreAuthorize("hasAuthority('report.sales')")
public List<HourlyBucket> salesByHour(@RequestParam(required = false) LocalDate dateFrom,
                                       @RequestParam(required = false) LocalDate dateTo,
                                       @RequestParam(required = false) UUID warehouseId) {
    return salesReports.byHour(defaultFrom(dateFrom), defaultTo(dateTo), warehouseId);
}

// Sales — add discount/void analysis
@GetMapping("/sales/discounts-voids")
@PreAuthorize("hasAuthority('report.sales')")
public DiscountVoidAnalysis discountsVoids(@RequestParam(required = false) LocalDate dateFrom,
                                            @RequestParam(required = false) LocalDate dateTo,
                                            @RequestParam(required = false) UUID warehouseId) {
    return salesReports.discountsVoids(defaultFrom(dateFrom), defaultTo(dateTo), warehouseId);
}

// Customer — add RFM segments
@GetMapping("/customers/rfm")
@PreAuthorize("hasAuthority('report.sales')")
public RfmSegments customerRfm(@RequestParam(required = false) LocalDate dateFrom,
                                @RequestParam(required = false) LocalDate dateTo) {
    return customerReports.rfm(defaultFrom(dateFrom), defaultTo(dateTo));
}

// Customer — add retention rate
@GetMapping("/customers/retention")
@PreAuthorize("hasAuthority('report.sales')")
public RetentionRate customerRetention(@RequestParam(required = false) LocalDate dateFrom,
                                        @RequestParam(required = false) LocalDate dateTo) {
    return customerReports.retention(defaultFrom(dateFrom), defaultTo(dateTo));
}

// Purchase — add by-category
@GetMapping("/purchases/by-category")
@PreAuthorize("hasAuthority('report.financial')")
public List<CategoryBucket> purchasesByCategory(@RequestParam(required = false) LocalDate dateFrom,
                                                  @RequestParam(required = false) LocalDate dateTo,
                                                  @RequestParam(required = false) UUID warehouseId) {
    return purchaseReports.byCategory(defaultFrom(dateFrom), defaultTo(dateTo), warehouseId);
}

// Payment — add AR aging
@GetMapping("/payments/aging")
@PreAuthorize("hasAuthority('report.financial')")
public ArAging paymentAging(@RequestParam(required = false) LocalDate asOf) {
    return paymentReports.aging(asOf != null ? asOf : LocalDate.now());
}

// Tax — add monthly schedule
@GetMapping("/tax/monthly-schedule")
@PreAuthorize("hasAuthority('report.financial')")
public List<MonthlyTaxBucket> taxMonthlySchedule(@RequestParam(required = false) Integer year) {
    return taxReports.monthlySchedule(year != null ? year : Year.now().getValue());
}

// Inventory — add turnover
@GetMapping("/inventory/turnover")
@PreAuthorize("hasAuthority('report.inventory')")
public List<TurnoverRow> inventoryTurnover(@RequestParam(required = false) UUID warehouseId,
                                            @RequestParam(defaultValue = "12") int months) {
    return inventoryReports.turnover(warehouseId, months);
}

// Inventory — add top/bottom movers
@GetMapping("/inventory/movers")
@PreAuthorize("hasAuthority('report.inventory')")
public MoversReport inventoryMovers(@RequestParam(required = false) UUID warehouseId,
                                     @RequestParam(defaultValue = "20") int limit) {
    return inventoryReports.movers(warehouseId, limit);
}
```

Add missing DTOs in `backend/report-service/src/main/java/io/smartpos/report/api/dto/`:

```java
// HourlyBucket.java
public record HourlyBucket(int hour, long count, BigDecimal net) {}

// DiscountVoidAnalysis.java
public record DiscountVoidAnalysis(BigDecimal totalDiscounts, long discountCount,
                                    BigDecimal totalVoids, long voidCount,
                                    BigDecimal discountRate, BigDecimal voidRate) {}

// RfmSegments.java
public record RfmSegments(int champions, int loyal, int atRisk, int lost,
                           List<RfmCustomer> customers) {}
public record RfmCustomer(UUID customerId, String customerName, int recency, int frequency,
                           BigDecimal monetary, String segment) {}

// RetentionRate.java
public record RetentionRate(double rate, int returningCustomers, int totalCustomers,
                             double priorPeriodRate, double change) {}

// CategoryBucket.java (reuse dimension pattern)
public record CategoryBucket(UUID categoryId, String categoryName, long count, BigDecimal net) {}

// ArAging.java
public record ArAging(List<AgingBucket> buckets, BigDecimal totalOutstanding) {}
public record AgingBucket(String label, int daysFrom, int daysTo, BigDecimal amount, int invoiceCount) {}

// MonthlyTaxBucket.java
public record MonthlyTaxBucket(int month, BigDecimal taxableSales, BigDecimal taxCollected,
                                BigDecimal outputTax, BigDecimal inputTax, BigDecimal netPayable) {}

// TurnoverRow.java
public record TurnoverRow(UUID productId, String productName, String productCode,
                           BigDecimal avgInventory, BigDecimal costOfGoodsSold, double turnoverRatio) {}

// MoversReport.java
public record MoversReport(List<MoverRow> top, List<MoverRow> bottom) {}
public record MoverRow(UUID productId, String productName, int qtySold, BigDecimal revenue, String direction) {}
```

Add corresponding service methods. For example, in SalesReportService:

```java
public List<HourlyBucket> byHour(LocalDate from, LocalDate to, UUID warehouseId) {
    // Query sales-service Feign for hourly aggregation
    return salesFeign.salesByHour(TenantContext.require(), from, to, warehouseId);
}

public DiscountVoidAnalysis discountsVoids(LocalDate from, LocalDate to, UUID warehouseId) {
    var summary = salesFeign.discountVoidSummary(TenantContext.require(), from, to, warehouseId);
    BigDecimal gross = summary.getGross();
    return new DiscountVoidAnalysis(
        summary.getTotalDiscounts(), summary.getDiscountCount(),
        summary.getTotalVoids(), summary.getVoidCount(),
        gross.signum() > 0 ? summary.getTotalDiscounts().divide(gross, 4, RoundingMode.HALF_UP) : BigDecimal.ZERO,
        gross.signum() > 0 ? summary.getTotalVoids().divide(gross, 4, RoundingMode.HALF_UP) : BigDecimal.ZERO
    );
}
```

Add corresponding Feign methods in SalesFeign, PaymentFeign, InventoryFeign.

Commit:
```bash
git add backend/report-service/
git commit -m "feat(reports): add deepened report endpoints — hourly, RFM, aging, turnover, movers"
```

---

### Task 1.2: Frontend — Add deepened report types and API functions

**Files:**
- Modify: `frontend/src/api/smartpos/reports.ts`

Add API types and functions for all new endpoints:

```typescript
// Add to reports.ts:

export interface HourlyBucket { hour: number; count: number; net: number; }
export async function getSalesByHour(params: { dateFrom?: string; dateTo?: string; warehouseId?: UUID } = {}): Promise<HourlyBucket[]> {
  const { data } = await api.get<HourlyBucket[]>('/api/v1/reports/sales/by-hour', { params });
  return data;
}

export interface DiscountVoidAnalysis { totalDiscounts: number; discountCount: number; totalVoids: number; voidCount: number; discountRate: number; voidRate: number; }
export async function getDiscountsVoids(params: { dateFrom?: string; dateTo?: string; warehouseId?: UUID } = {}): Promise<DiscountVoidAnalysis> {
  const { data } = await api.get<DiscountVoidAnalysis>('/api/v1/reports/sales/discounts-voids', { params });
  return data;
}

export interface RfmCustomer { customerId: UUID; customerName: string; recency: number; frequency: number; monetary: number; segment: string; }
export interface RfmSegments { champions: number; loyal: number; atRisk: number; lost: number; customers: RfmCustomer[]; }
export async function getCustomerRfm(params: { dateFrom?: string; dateTo?: string } = {}): Promise<RfmSegments> {
  const { data } = await api.get<RfmSegments>('/api/v1/reports/customers/rfm', { params });
  return data;
}

export interface RetentionRate { rate: number; returningCustomers: number; totalCustomers: number; priorPeriodRate: number; change: number; }
export async function getCustomerRetention(params: { dateFrom?: string; dateTo?: string } = {}): Promise<RetentionRate> {
  const { data } = await api.get<RetentionRate>('/api/v1/reports/customers/retention', { params });
  return data;
}

export interface CategoryBucket { categoryId?: UUID | null; categoryName?: string | null; count: number; net: number; }
export async function getPurchasesByCategory(params: { dateFrom?: string; dateTo?: string; warehouseId?: UUID } = {}): Promise<CategoryBucket[]> {
  const { data } = await api.get<CategoryBucket[]>('/api/v1/reports/purchases/by-category', { params });
  return data;
}

export interface AgingBucket { label: string; daysFrom: number; daysTo: number; amount: number; invoiceCount: number; }
export interface ArAging { buckets: AgingBucket[]; totalOutstanding: number; }
export async function getArAging(params: { asOf?: string } = {}): Promise<ArAging> {
  const { data } = await api.get<ArAging>('/api/v1/reports/payments/aging', { params });
  return data;
}

export interface MonthlyTaxBucket { month: number; taxableSales: number; taxCollected: number; outputTax: number; inputTax: number; netPayable: number; }
export async function getMonthlyTaxSchedule(params: { year?: number } = {}): Promise<MonthlyTaxBucket[]> {
  const { data } = await api.get<MonthlyTaxBucket[]>('/api/v1/reports/tax/monthly-schedule', { params });
  return data;
}

export interface TurnoverRow { productId: UUID; productName: string; productCode?: string | null; avgInventory: number; costOfGoodsSold: number; turnoverRatio: number; }
export async function getInventoryTurnover(params: { warehouseId?: UUID; months?: number } = {}): Promise<TurnoverRow[]> {
  const { data } = await api.get<TurnoverRow[]>('/api/v1/reports/inventory/turnover', { params });
  return data;
}

export interface MoverRow { productId: UUID; productName: string; qtySold: number; revenue: number; direction: string; }
export interface MoversReport { top: MoverRow[]; bottom: MoverRow[]; }
export async function getInventoryMovers(params: { warehouseId?: UUID; limit?: number } = {}): Promise<MoversReport> {
  const { data } = await api.get<MoversReport>('/api/v1/reports/inventory/movers', { params });
  return data;
}
```

Commit:
```bash
git add frontend/src/api/smartpos/reports.ts
git commit -m "feat(reports): add API types and functions for deepened report endpoints"
```

---

### Task 1.3: Deepen SalesReportPage

**Files:**
- Modify: `frontend/src/views/smartpos/reports/SalesReportPage.tsx`

Add to existing SalesReportPage:
1. Import new API functions: `getSalesByHour`, `getDiscountsVoids`
2. Add state: `hourly` (HourlyBucket[]), `discountsVoids` (DiscountVoidAnalysis | null)
3. Fetch in useEffect alongside existing calls
4. Add discount/void KPI cards to kpis array
5. Add hourly heatmap/chart section
6. Add employee sales table (already fetched via byDimension or separate call)

Key additions to existing page:

```tsx
// Add to state:
const [hourly, setHourly] = useState<HourlyBucket[]>([]);
const [dv, setDv] = useState<DiscountVoidAnalysis | null>(null);

// Add to useEffect fetch:
getSalesByHour({ dateFrom: filters.dateFrom, dateTo: filters.dateTo, warehouseId: filters.warehouseId as UUID || undefined }),
getDiscountsVoids({ dateFrom: filters.dateFrom, dateTo: filters.dateTo, warehouseId: filters.warehouseId as UUID || undefined }),

// Add to kpis:
{ label: 'Discount Rate', value: dv ? `${(dv.discountRate * 100).toFixed(1)}%` : '—', color: brand.warning.main },
{ label: 'Void Rate', value: dv ? `${(dv.voidRate * 100).toFixed(2)}%` : '—', color: brand.error.main },
{ label: 'Discounts', value: formatMoney(dv?.totalDiscounts ?? 0), color: brand.warning.main },
{ label: 'Voids', value: formatMoney(dv?.totalVoids ?? 0), color: brand.error.main },

// Add hourly heatmap chart (use ReportChartCard):
<ReportChartCard
  title="Sales by Hour"
  options={hourlyHeatmapOptions}
  series={[{ name: 'Orders', data: hourly.map(h => h.count) }, { name: 'Revenue', data: hourly.map(h => h.net) }]}
  type="bar"
  height={300}
/>
```

Commit:
```bash
git add frontend/src/views/smartpos/reports/SalesReportPage.tsx
git commit -m "feat(reports): deepen SalesReport with hourly chart, discounts/voids KPIs"
```

---

### Task 1.4: Deepen CustomerReportPage

**Files:**
- Modify: `frontend/src/views/smartpos/reports/CustomerReportPage.tsx`

Add to existing page:
1. Import: `getCustomerRfm`, `getCustomerRetention`
2. Add state: `rfm` (RfmSegments | null), `retention` (RetentionRate | null)
3. Fetch in useEffect
4. Add RFM segment summary cards (Champions, Loyal, At Risk, Lost)
5. Add RFM customer DataTable with segment filter
6. Add retention rate KPI with delta indicator

```tsx
// Add to kpis:
{ label: 'Retention Rate', value: retention ? `${retention.rate.toFixed(1)}%` : '—',
  color: brand.success.main,
  trend: retention ? { direction: retention.change >= 0 ? 'up' : 'down', value: `${Math.abs(retention.change).toFixed(1)}%` } : undefined },

// Add RFM segment cards row:
<Stack direction="row" spacing={2} sx={{ mb: 2 }}>
  {['champions', 'loyal', 'atRisk', 'lost'].map(seg => {
    const count = rfm ? rfm[seg as keyof RfmSegments] as number : 0;
    const colors: Record<string, string> = { champions: brand.success.main, loyal: brand.primary[600], atRisk: brand.warning.main, lost: brand.error.main };
    return <Card key={seg} sx={{ flex: 1, textAlign: 'center', p: 2, border: `1px solid ${brand.neutral[200]}`, borderRadius: 3 }}>
      <Typography sx={{ fontWeight: 800, fontSize: 24, color: colors[seg] }}>{count}</Typography>
      <Typography variant="caption" sx={{ textTransform: 'capitalize' }}>{seg}</Typography>
    </Card>;
  })}
</Stack>

// RFM customer table:
<ReportDataTable
  title="Customer Segmentation (RFM)"
  columns={rfmColumns}
  rows={rfm?.customers ?? []}
  getRowKey={(r) => r.customerId}
/>
```

Commit:
```bash
git add frontend/src/views/smartpos/reports/CustomerReportPage.tsx
git commit -m "feat(reports): deepen CustomerReport with RFM segments, retention rate"
```

---

### Task 1.5: Deepen PurchaseReportPage

**Files:**
- Modify: `frontend/src/views/smartpos/reports/PurchaseReportPage.tsx`

Add category donut chart and supplier trend line using `getPurchasesByCategory` and existing purchase summary endpoints.

```tsx
// Add byCategory chart:
<ReportChartCard
  title="Purchases by Category"
  options={categoryDonutOptions}
  series={byCategory.map(c => c.net)}
  type="donut"
  height={300}
/>
```

Commit:
```bash
git add frontend/src/views/smartpos/reports/PurchaseReportPage.tsx
git commit -m "feat(reports): deepen PurchaseReport with category donut, supplier trend"
```

---

### Task 1.6: Deepen PaymentReportPage

**Files:**
- Modify: `frontend/src/views/smartpos/reports/PaymentReportPage.tsx`

Add AR aging table with colored buckets using `getArAging`.

```tsx
// AR Aging table:
<ReportDataTable
  title="Accounts Receivable Aging"
  columns={[
    { id: 'label', label: 'Aging Bucket', render: (r: AgingBucket) => r.label },
    { id: 'invoices', label: 'Invoices', align: 'right', render: (r: AgingBucket) => formatNumber(r.invoiceCount) },
    { id: 'amount', label: 'Outstanding', align: 'right', render: (r: AgingBucket) => formatMoney(r.amount) },
  ]}
  rows={aging?.buckets ?? []}
  getRowKey={(r) => r.label}
/>
```

Commit:
```bash
git add frontend/src/views/smartpos/reports/PaymentReportPage.tsx
git commit -m "feat(reports): deepen PaymentReport with AR aging"
```

---

### Task 1.7: Deepen TaxReportPage and InventoryReportPage

**Files:**
- Modify: `frontend/src/views/smartpos/reports/TaxReportPage.tsx`
- Modify: `frontend/src/views/smartpos/reports/InventoryReportPage.tsx`

Tax: Add monthly tax schedule table with `getMonthlyTaxSchedule`.
Inventory: Add turnover ratio table with `getInventoryTurnover` and top/bottom movers with `getInventoryMovers`.

Commit:
```bash
git add frontend/src/views/smartpos/reports/TaxReportPage.tsx \
        frontend/src/views/smartpos/reports/InventoryReportPage.tsx
git commit -m "feat(reports): deepen TaxReport with monthly schedule, Inventory with turnover and movers"
```

---

## Phase 2: New Report Types

### Task 2.1: Backend — SupplierReportService and endpoint

**Files:**
- Create: `backend/report-service/src/main/java/io/smartpos/report/infrastructure/feign/SupplierFeign.java`
- Create: `backend/report-service/src/main/java/io/smartpos/report/application/SupplierReportService.java`
- Create: `backend/report-service/src/main/java/io/smartpos/report/api/dto/SupplierReportDto.java`
- Modify: `backend/report-service/src/main/java/io/smartpos/report/api/ReportController.java`

SupplierFeign.java:
```java
@FeignClient(name = "sales-service", path = "/api/v1")
public interface SupplierFeign {
    @GetMapping("/purchases/by-supplier")
    List<SupplierSpendRow> spendBySupplier(@RequestParam UUID tenantId, @RequestParam LocalDate from,
                                            @RequestParam LocalDate to);

    @GetMapping("/suppliers/{supplierId}/ledger")
    SupplierLedgerRow ledger(@PathVariable UUID supplierId, @RequestParam UUID tenantId,
                              @RequestParam LocalDate from, @RequestParam LocalDate to);
}
```

SupplierReportService.java:
```java
@Service
@RequiredArgsConstructor
public class SupplierReportService {
    private final SupplierFeign supplierFeign;

    public SupplierReportDto report(LocalDate from, LocalDate to) {
        UUID tenantId = TenantContext.require();
        var spend = supplierFeign.spendBySupplier(tenantId, from, to);
        // Aggregate: total spend, top suppliers, on-time delivery %
        return new SupplierReportDto(/* ... */);
    }
}
```

Add to ReportController:
```java
@GetMapping("/suppliers/summary")
@PreAuthorize("hasAuthority('report.financial')")
public SupplierReportDto supplierSummary(@RequestParam(required = false) LocalDate dateFrom,
                                          @RequestParam(required = false) LocalDate dateTo) {
    return supplierReports.report(defaultFrom(dateFrom), defaultTo(dateTo));
}
```

Commit:
```bash
git add backend/report-service/
git commit -m "feat(reports): add SupplierReportService with spend and ledger endpoints"
```

---

### Task 2.2: Frontend — SupplierReportPage

**Files:**
- Create: `frontend/src/views/smartpos/reports/SupplierReportPage.tsx`
- Modify: `frontend/src/api/smartpos/reports.ts`

Full page following existing pattern with:
- KPI cards: Total Spend, Active Suppliers, Avg Lead Time, On-Time Delivery %
- Supplier spend bar chart
- Top suppliers DataTable
- Click row → supplier detail page

Commit:
```bash
git add frontend/src/views/smartpos/reports/SupplierReportPage.tsx frontend/src/api/smartpos/reports.ts
git commit -m "feat(reports): add SupplierReportPage with spend, performance, ledger"
```

---

### Task 2.3: Backend — FinancialReportService

**Files:**
- Create: `backend/report-service/src/main/java/io/smartpos/report/application/FinancialReportService.java`
- Create: `backend/report-service/src/main/java/io/smartpos/report/api/dto/FinancialReportDto.java`
- Modify: `backend/report-service/src/main/java/io/smartpos/report/api/ReportController.java`

FinancialReportDto with 3 sections:
```java
public record FinancialReportDto(
    BalanceSheet balanceSheet,
    TrialBalance trialBalance,
    CashFlowStatement cashFlow
) {}
public record BalanceSheet(List<AccountGroup> assets, List<AccountGroup> liabilities,
                            List<AccountGroup> equity, BigDecimal totalAssets,
                            BigDecimal totalLiabilitiesEquity) {}
public record AccountGroup(String code, String name, BigDecimal balance, List<AccountGroup> children) {}
public record TrialBalance(List<TrialBalanceRow> rows, BigDecimal totalDebits, BigDecimal totalCredits) {}
public record TrialBalanceRow(String accountCode, String accountName, BigDecimal debit, BigDecimal credit) {}
public record CashFlowStatement(BigDecimal operating, BigDecimal investing, BigDecimal financing,
                                 BigDecimal netChange, BigDecimal openingBalance, BigDecimal closingBalance) {}
```

FinancialReportService queries the payment-service chart_of_accounts and ledger tables via Feign.

Add to ReportController:
```java
@GetMapping("/financial/balance-sheet")
@GetMapping("/financial/trial-balance")
@GetMapping("/financial/cash-flow")
```

Commit:
```bash
git add backend/report-service/
git commit -m "feat(reports): add FinancialReportService with Balance Sheet, Trial Balance, Cash Flow"
```

---

### Task 2.4: Frontend — FinancialReportPage

**Files:**
- Create: `frontend/src/views/smartpos/reports/FinancialReportPage.tsx`

3-tab layout (Balance Sheet | Trial Balance | Cash Flow) using MUI Tabs. Each tab renders data tables with account hierarchy.

```tsx
<Tabs value={tab} onChange={(_, v) => setTab(v)}>
  <Tab label="Balance Sheet" />
  <Tab label="Trial Balance" />
  <Tab label="Cash Flow" />
</Tabs>
{tab === 0 && <BalanceSheetView data={data?.balanceSheet} />}
{tab === 1 && <TrialBalanceView data={data?.trialBalance} />}
{tab === 2 && <CashFlowView data={data?.cashFlow} />}
```

Commit:
```bash
git add frontend/src/views/smartpos/reports/FinancialReportPage.tsx
git commit -m "feat(reports): add FinancialReportPage with 3-tab layout"
```

---

### Task 2.5: Backend — Fix EmployeeReportService

**Files:**
- Modify: `backend/report-service/src/main/java/io/smartpos/report/api/ReportController.java`
- Create: `backend/report-service/src/main/java/io/smartpos/report/infrastructure/feign/HrmFeign.java`
- Modify: `backend/report-service/src/main/java/io/smartpos/report/application/SalesReportService.java`

Replace the hardcoded `List.of()` in the employee sales endpoint. Add HrmFeign to pull employee names, join with sales data.

```java
// In SalesReportService:
public EmployeeSalesDto employeeSales(LocalDate from, LocalDate to) {
    var salesByUser = salesFeign.salesByUser(TenantContext.require(), from, to);
    var userIds = salesByUser.stream().map(SalesByUser::userId).toList();
    var users = hrmFeign.getUsersByIds(userIds);
    var rows = salesByUser.stream().map(s -> {
        var u = users.get(s.userId());
        return new EmployeeSalesRow(s.userId(), u != null ? u.name() : "Unknown",
                s.saleCount(), s.totalNet(), s.totalGross(), s.itemsSold());
    }).toList();
    return new EmployeeSalesDto(from, to, rows);
}
```

Commit:
```bash
git add backend/report-service/
git commit -m "feat(reports): fix EmployeeReportService with real HRM data join"
```

---

### Task 2.6: Frontend — EmployeeReportPage

**Files:**
- Create: `frontend/src/views/smartpos/reports/EmployeeReportPage.tsx`

Leaderboard-style page:
- Top employees bar chart (sales by employee)
- Employee DataTable: name, sales count, revenue, commission, avg transaction
- Period filter

Commit:
```bash
git add frontend/src/views/smartpos/reports/EmployeeReportPage.tsx
git commit -m "feat(reports): add EmployeeReportPage with leaderboard and commission"
```

---

### Task 2.7: Backend — OperationsReportService

**Files:**
- Create: `backend/report-service/src/main/java/io/smartpos/report/application/OperationsReportService.java`
- Create: `backend/report-service/src/main/java/io/smartpos/report/api/dto/OperationsReportDto.java`
- Modify: `backend/report-service/src/main/java/io/smartpos/report/api/ReportController.java`

OperationsReportDto:
```java
public record OperationsReportDto(
    List<RegisterSummary> registers,
    List<ShiftSummary> shifts,
    DailyCloseSummary dailyClose
) {}
public record RegisterSummary(UUID terminalId, String terminalName, BigDecimal openingAmount,
                               BigDecimal closingAmount, BigDecimal cashSales, BigDecimal cardSales,
                               BigDecimal expectedCash, BigDecimal actualCash, BigDecimal difference) {}
public record ShiftSummary(String shiftName, LocalTime start, LocalTime end, int transactionCount,
                            BigDecimal totalSales, int voidCount, BigDecimal voidAmount) {}
public record DailyCloseSummary(LocalDate date, BigDecimal totalSales, int totalTransactions,
                                 BigDecimal totalVoids, BigDecimal cashToBank, String status) {}
```

Commit:
```bash
git add backend/report-service/
git commit -m "feat(reports): add OperationsReportService with register, shift, daily close"
```

---

### Task 2.8: Frontend — OperationsReportPage

**Files:**
- Create: `frontend/src/views/smartpos/reports/OperationsReportPage.tsx`

Register summary cards, shift report table, daily close summary.

Commit:
```bash
git add frontend/src/views/smartpos/reports/OperationsReportPage.tsx
git commit -m "feat(reports): add OperationsReportPage"
```

---

## Phase 3: Enterprise Features

### Task 3.1: Document Templates for Reports

**Files:**
- Create: 8 Handlebars templates in `backend/document-service/src/main/resources/templates/`

Templates:
1. `report-sales.hbs` — KPI header row, revenue chart, top products table, employee breakdown
2. `report-financial.hbs` — Balance Sheet table, P&L table, Cash Flow table
3. `report-inventory.hbs` — Stock summary, turnover, expiry timeline
4. `report-customer.hbs` — RFM grid, retention chart, top customers
5. `report-supplier.hbs` — Performance cards, spend chart, ledger
6. `report-tax.hbs` — Tax by rate/category, filing summary, monthly schedule
7. `report-employee.hbs` — Leaderboard, commission, performance chart
8. `report-operations.hbs` — Register summary, shift report, daily close

Each template uses the Letis POS brand (logo in header, brand colors, fonts, page numbers in footer).

Commit:
```bash
git add backend/document-service/src/main/resources/templates/
git commit -m "feat(docs): add 8 report Handlebars templates for branded PDF output"
```

---

### Task 3.2: Backend — Comparative Period Logic

**Files:**
- Modify: `backend/report-service/src/main/java/io/smartpos/report/api/ReportController.java`
- Modify: `backend/report-service/src/main/java/io/smartpos/report/application/SalesReportService.java`

Add `priorDateFrom` and `priorDateTo` parameters to summary endpoints. Auto-calculate if not provided:

```java
@GetMapping("/sales/summary")
public SalesSummaryDto salesSummary(
        @RequestParam(required = false) LocalDate dateFrom,
        @RequestParam(required = false) LocalDate dateTo,
        @RequestParam(required = false) LocalDate priorFrom,  // NEW
        @RequestParam(required = false) LocalDate priorTo,    // NEW
        @RequestParam(required = false) UUID warehouseId,
        @RequestParam(required = false) UUID customerId) {
    LocalDate from = defaultFrom(dateFrom);
    LocalDate to = defaultTo(dateTo);
    // Auto-calculate prior period if not provided
    if (priorFrom == null) priorFrom = from.minusDays(to.toEpochDay() - from.toEpochDay() + 1);
    if (priorTo == null) priorTo = from.minusDays(1);
    return salesReports.summary(from, to, priorFrom, priorTo, warehouseId, customerId);
}
```

Add delta fields to SalesSummaryDto:
```java
public record SalesSummaryDto(/* existing fields */,
    BigDecimal priorNet, BigDecimal netChange, BigDecimal netChangePercent) {}
```

Apply same pattern to all summary DTOs.

Commit:
```bash
git add backend/report-service/
git commit -m "feat(reports): add comparative period logic to all summary endpoints"
```

---

### Task 3.3: Frontend — Comparative Period KPI Cards

**Files:**
- Modify: `frontend/src/components/smartpos/reports/ReportKpiRow.tsx`
- Modify: `frontend/src/api/smartpos/reports.ts`

Update KpiCard type to include trend data:
```typescript
export interface KpiCard {
  label: string;
  value: string;
  color?: string;
  sparkline?: number[];
  trend?: { direction: 'up' | 'down'; value: string };  // NEW
}
```

Render trend indicator on each KPI card:
```tsx
{card.trend && (
  <Stack direction="row" spacing={0.5} alignItems="center" sx={{ mt: 0.5 }}>
    {card.trend.direction === 'up' ? <IconArrowUp size={12} color={brand.success.main} /> : <IconArrowDown size={12} color={brand.error.main} />}
    <Typography variant="caption" sx={{ fontWeight: 700, color: card.trend.direction === 'up' ? brand.success.main : brand.error.main }}>
      {card.trend.value}
    </Typography>
    <Typography variant="caption" sx={{ color: brand.neutral[400] }}>vs prior period</Typography>
  </Stack>
)}
```

Update report pages to compute and pass trend data from API responses.

Commit:
```bash
git add frontend/src/components/smartpos/reports/ReportKpiRow.tsx \
        frontend/src/api/smartpos/reports.ts
git commit -m "feat(reports): add comparative period trend indicators to KPI cards"
```

---

### Task 3.4: Frontend — Drill-Down Navigation

**Files:**
- Modify: `frontend/src/components/smartpos/reports/ReportChartCard.tsx`
- Modify: `frontend/src/components/smartpos/reports/ReportDataTable.tsx`

Add `onDrillDown` callback props:

```tsx
// ReportChartCard — add onDataPointClick:
interface Props {
  // existing props...
  onDataPointClick?: (seriesIndex: number, dataPointIndex: number) => void;
}
// Pass to ApexCharts events:
chart: {
  events: {
    dataPointSelection: (_event, _chartContext, config) => {
      onDataPointClick?.(config.seriesIndex, config.dataPointIndex);
    }
  }
}

// ReportDataTable — add onRowClick:
interface Column<T> {
  // existing fields...
}
interface Props<T> {
  // existing props...
  onRowClick?: (row: T) => void;
}
```

In report pages, wire clicks to state changes:
```tsx
// SalesReportPage:
const [drillCategory, setDrillCategory] = useState<string | null>(null);

// In by-dimension chart:
<ReportChartCard
  onDataPointClick={(_, idx) => setDrillCategory(byDimension?.buckets[idx]?.dimensionName ?? null)}
/>

// Show filtered products when drilled:
{drillCategory && (
  <ReportDataTable
    title={`Products in ${drillCategory}`}
    columns={productColumns}
    rows={products.filter(p => p.categoryName === drillCategory)}
    getRowKey={r => r.productId}
  />
)}
```

Commit:
```bash
git add frontend/src/components/smartpos/reports/
git commit -m "feat(reports): add drill-down navigation to chart and table components"
```

---

### Task 3.5: Backend — Scheduled Report Delivery

**Files:**
- Create: `backend/report-service/src/main/java/io/smartpos/report/domain/model/ScheduledReport.java`
- Create: `backend/report-service/src/main/java/io/smartpos/report/domain/repository/ScheduledReportRepository.java`
- Create: `backend/report-service/src/main/java/io/smartpos/report/application/ReportScheduler.java`
- Create: `backend/report-service/src/main/java/io/smartpos/report/api/ScheduledReportController.java`
- Create: Flyway migration `V13__scheduled_reports.sql`

ScheduledReport entity:
```java
@Entity @Table(name = "scheduled_reports")
public class ScheduledReport {
    @Id private UUID id;
    private UUID tenantId;
    private String reportKey;       // "sales-summary", "profit-loss", etc.
    private String frequency;       // DAILY, WEEKLY, MONTHLY
    private String cronExpression;  // "0 8 * * *" = 8am daily
    private String recipients;      // comma-separated emails
    private String format;          // PDF, XLSX
    private boolean active;
    private Instant lastRunAt;
    private Instant nextRunAt;
    private Instant createdAt;
}
```

ReportScheduler — Spring @Scheduled task that:
1. Queries active ScheduledReports where nextRunAt <= now
2. Generates report via ReportService
3. Renders PDF via DocumentService Feign
4. Emails to recipients via NotificationClient Feign
5. Updates lastRunAt, nextRunAt

ScheduledReportController — CRUD for managing schedules.

Commit:
```bash
git add backend/report-service/
git commit -m "feat(reports): add scheduled report delivery with cron-based email"
```

---

### Task 3.6: Frontend — Scheduled Delivery UI

**Files:**
- Create: `frontend/src/views/smartpos/reports/ReportSchedulesPage.tsx`
- Modify: `frontend/src/api/smartpos/reports.ts`

Page listing configured schedules with create/edit drawer. Form fields: report type, frequency, recipients, format, active toggle.

Commit:
```bash
git add frontend/src/views/smartpos/reports/ReportSchedulesPage.tsx frontend/src/api/smartpos/reports.ts
git commit -m "feat(reports): add scheduled delivery management page"
```

---

### Task 3.7: Backend — Custom Dashboards (Saved Views)

**Files:**
- Create: `backend/report-service/src/main/java/io/smartpos/report/domain/model/ReportDashboard.java`
- Create: `backend/report-service/src/main/java/io/smartpos/report/domain/repository/ReportDashboardRepository.java`
- Create: `backend/report-service/src/main/java/io/smartpos/report/api/ReportDashboardController.java`
- Create: Flyway migration `V14__report_dashboards.sql`

ReportDashboard entity:
```java
@Entity @Table(name = "report_dashboards")
public class ReportDashboard {
    @Id private UUID id;
    private UUID tenantId;
    private UUID userId;
    private String name;
    private String layout;  // JSON: [{type: "kpi", reportKey: "sales-summary", field: "net"}, {type: "chart", ...}, ...]
    private String filters; // JSON: {dateFrom: "...", dateTo: "...", warehouseId: "..."}
    private boolean shared;
    private Instant createdAt;
    private Instant updatedAt;
}
```

ReportDashboardController — CRUD for saved views:
```java
@RestController @RequestMapping("/api/v1/reports/dashboards")
public class ReportDashboardController {
    @GetMapping List<ReportDashboardDto> list();
    @PostMapping ReportDashboardDto create(@RequestBody CreateRequest req);
    @PutMapping("/{id}") ReportDashboardDto update(@PathVariable UUID id, @RequestBody CreateRequest req);
    @DeleteMapping("/{id}") void delete(@PathVariable UUID id);
}
```

Commit:
```bash
git add backend/report-service/
git commit -m "feat(reports): add custom dashboard saved views CRUD"
```

---

### Task 3.8: Frontend — ReportBuilderPage

**Files:**
- Create: `frontend/src/views/smartpos/reports/ReportBuilderPage.tsx`

Drag-drop report builder. Users select from available widget types (KPI, Chart, Table) for each report category, arrange them in a grid, and save as a named dashboard.

```tsx
export default function ReportBuilderPage() {
  // State: availableWidgets[], dashboardWidgets[], dashboardName, savedDashboards[]
  // Grid of widgets with drag handles
  // "Add Widget" drawer — pick report type, widget type, specific metric
  // Save button → POST /api/v1/reports/dashboards
}
```

Commit:
```bash
git add frontend/src/views/smartpos/reports/ReportBuilderPage.tsx
git commit -m "feat(reports): add ReportBuilderPage with drag-drop custom dashboards"
```

---

### Task 3.9: Menu + Router — Final Wiring

**Files:**
- Modify: `frontend/src/layouts/full/vertical/sidebar/SmartPosMenuItems.ts`
- Modify: `frontend/src/routes/Router.tsx`

Replace "soon" chips:
```typescript
// Replace:
{ id: uid(), title: 'Financial Reports', icon: IconChartInfographic, ...soon },
{ id: uid(), title: 'Supplier Reports', icon: IconTruck, ...soon },
{ id: uid(), title: 'Employee Reports', icon: IconUsersGroup, ...soon },
// With:
{ id: uid(), title: 'Financial Reports', icon: IconChartInfographic, href: '/smartpos/reports/financial' },
{ id: uid(), title: 'Supplier Reports', icon: IconTruck, href: '/smartpos/reports/suppliers' },
{ id: uid(), title: 'Employee Reports', icon: IconUsersGroup, href: '/smartpos/reports/employees' },
// Add:
{ id: uid(), title: 'Operations Report', icon: IconClipboardCheck, href: '/smartpos/reports/operations' },
{ id: uid(), title: 'Report Schedules', icon: IconClock, href: '/smartpos/reports/schedules' },
{ id: uid(), title: 'Report Builder', icon: IconLayoutDashboard, href: '/smartpos/reports/builder' },
```

Add routes: `reports/financial`, `reports/suppliers`, `reports/employees`, `reports/operations`, `reports/schedules`, `reports/builder`.

Add lazy imports at top of Router.tsx.

Commit:
```bash
git add frontend/src/layouts/full/vertical/sidebar/SmartPosMenuItems.ts frontend/src/routes/Router.tsx
git commit -m "feat(reports): wire up all new report pages in menu and router"
```

---

### Task 3.10: Final verification

```bash
cd frontend && npx tsc --noEmit && npx eslint . --ext ts,tsx
cd backend && mvn -pl report-service compile -q
```
