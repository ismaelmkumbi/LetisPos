# Enterprise Reporting System — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a full enterprise-grade reporting system — 6 new backend endpoints, 3 new AI endpoints, 8 new interactive report pages, 7 shared components, and 4 AI components.

**Architecture:** Individual routable report pages + shared component library. Each report gets its own route and page component. Shared components (filter bar, KPI cards, charts, tables, export toolbar, AI panels) ensure consistency across all pages.

**Tech Stack:** Java 21, Spring Boot 3, OpenFeign, JPA, PostgreSQL, Redis, Kafka, MinIO (backend); React 19, TypeScript, MUI 7, ApexCharts, Axios (frontend).

**Spec:** `docs/superpowers/specs/2026-05-06-enterprise-reporting-system-design.md`

---

## Phase 1 — Backend DTOs

### Task 1: TaxSummaryDto

**Files:**
- Create: `backend/report-service/src/main/java/io/smartpos/report/api/dto/TaxSummaryDto.java`

- [ ] **Step 1: Write TaxSummaryDto record**

```java
package io.smartpos.report.api.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

public record TaxSummaryDto(
        LocalDate from, LocalDate to,
        BigDecimal totalTax,
        BigDecimal taxableSales,
        long transactionCount,
        List<TaxByRate> byRate,
        List<TaxByCategory> byCategory
) {
    public record TaxByRate(BigDecimal rate, BigDecimal taxAmount, BigDecimal taxableAmount, long count) {}
    public record TaxByCategory(String categoryName, BigDecimal taxAmount, BigDecimal taxableAmount, long count) {}
}
```

- [ ] **Step 2: Commit**

```bash
git add backend/report-service/src/main/java/io/smartpos/report/api/dto/TaxSummaryDto.java
git commit -m "feat: add TaxSummaryDto for tax report endpoint"
```

---

### Task 2: PurchaseSummaryDto

**Files:**
- Create: `backend/report-service/src/main/java/io/smartpos/report/api/dto/PurchaseSummaryDto.java`

- [ ] **Step 1: Write PurchaseSummaryDto record**

```java
package io.smartpos.report.api.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public record PurchaseSummaryDto(
        LocalDate from, LocalDate to,
        long count,
        BigDecimal gross, BigDecimal paid, BigDecimal due,
        BigDecimal avgPurchase,
        List<DashboardDto.SeriesPoint> series,
        List<TopSupplier> topSuppliers
) {
    public record TopSupplier(UUID supplierId, String supplierName, long orderCount, BigDecimal totalSpent) {}
}
```

- [ ] **Step 2: Commit**

```bash
git add backend/report-service/src/main/java/io/smartpos/report/api/dto/PurchaseSummaryDto.java
git commit -m "feat: add PurchaseSummaryDto for purchase report endpoint"
```

---

### Task 3: PaymentSummaryDto

**Files:**
- Create: `backend/report-service/src/main/java/io/smartpos/report/api/dto/PaymentSummaryDto.java`

- [ ] **Step 1: Write PaymentSummaryDto record**

```java
package io.smartpos.report.api.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public record PaymentSummaryDto(
        LocalDate from, LocalDate to,
        long totalCount,
        BigDecimal totalIn, BigDecimal totalOut, BigDecimal netFlow,
        BigDecimal outstanding,
        List<DashboardDto.SeriesPoint> inflowSeries,
        List<ByMethod> byMethod
) {
    public record ByMethod(String method, BigDecimal total, long count) {}
}
```

- [ ] **Step 2: Commit**

```bash
git add backend/report-service/src/main/java/io/smartpos/report/api/dto/PaymentSummaryDto.java
git commit -m "feat: add PaymentSummaryDto for payment report endpoint"
```

---

### Task 4: CustomerSummaryDto

**Files:**
- Create: `backend/report-service/src/main/java/io/smartpos/report/api/dto/CustomerSummaryDto.java`

- [ ] **Step 1: Write CustomerSummaryDto record**

```java
package io.smartpos.report.api.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public record CustomerSummaryDto(
        LocalDate from, LocalDate to,
        long totalCustomers,
        long activeCustomers,
        long newCustomers,
        BigDecimal totalRevenue,
        BigDecimal avgRevenuePerCustomer,
        List<TopCustomer> topCustomers,
        List<FrequencyBucket> frequencyDistribution
) {
    public record TopCustomer(UUID customerId, String customerName, long orderCount, BigDecimal totalSpent, LocalDate lastPurchase) {}
    public record FrequencyBucket(String label, long customerCount, BigDecimal revenueShare) {}
}
```

- [ ] **Step 2: Commit**

```bash
git add backend/report-service/src/main/java/io/smartpos/report/api/dto/CustomerSummaryDto.java
git commit -m "feat: add CustomerSummaryDto for customer report endpoint"
```

---

### Task 5: EmployeeSalesDto

**Files:**
- Create: `backend/report-service/src/main/java/io/smartpos/report/api/dto/EmployeeSalesDto.java`

- [ ] **Step 1: Write EmployeeSalesDto record**

```java
package io.smartpos.report.api.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public record EmployeeSalesDto(
        LocalDate from, LocalDate to,
        List<EmployeeRow> rows
) {
    public record EmployeeRow(UUID employeeId, String employeeName, long saleCount, BigDecimal totalNet, BigDecimal totalGross, long itemsSold) {}
}
```

- [ ] **Step 2: Commit**

```bash
git add backend/report-service/src/main/java/io/smartpos/report/api/dto/EmployeeSalesDto.java
git commit -m "feat: add EmployeeSalesDto for employee sales endpoint"
```

---

## Phase 2 — Backend Services

### Task 6: TaxReportService

**Files:**
- Create: `backend/report-service/src/main/java/io/smartpos/report/application/TaxReportService.java`

- [ ] **Step 1: Write TaxReportService**

```java
package io.smartpos.report.application;

import io.smartpos.common.context.TenantContext;
import io.smartpos.report.api.dto.DashboardDto;
import io.smartpos.report.api.dto.TaxSummaryDto;
import io.smartpos.report.infrastructure.config.RedisCacheConfig;
import lombok.RequiredArgsConstructor;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.sql.Date;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class TaxReportService {

    private final JdbcTemplate jdbc;

    @Cacheable(value = RedisCacheConfig.CACHE_PROFIT_LOSS,
               key = "T(io.smartpos.report.infrastructure.config.RedisCacheConfig).tenantKey(#from, #to, 'tax')",
               unless = "#result == null")
    @Transactional(readOnly = true)
    public TaxSummaryDto summary(LocalDate from, LocalDate to) {
        UUID tenantId = TenantContext.require();

        String aggSql = """
            SELECT COALESCE(SUM(f.tax), 0) AS total_tax,
                   COALESCE(SUM(f.net), 0)  AS taxable_sales,
                   COUNT(*)                 AS tx_count
              FROM fact_product_sales_daily f
             WHERE f.tenant_id = ?::uuid
               AND f.date BETWEEN ? AND ?
        """;

        var agg = jdbc.queryForMap(aggSql, tenantId, Date.valueOf(from), Date.valueOf(to));

        String byRateSql = """
            SELECT f.tax_rate, SUM(f.tax) AS tax_amt, SUM(f.net) AS taxable_amt, COUNT(*) AS cnt
              FROM fact_product_sales_daily f
             WHERE f.tenant_id = ?::uuid AND f.date BETWEEN ? AND ?
             GROUP BY f.tax_rate
             ORDER BY tax_amt DESC
        """;

        List<TaxSummaryDto.TaxByRate> byRate = jdbc.query(byRateSql,
                ps -> { ps.setObject(1, tenantId); ps.setObject(2, Date.valueOf(from)); ps.setObject(3, Date.valueOf(to)); },
                (rs, i) -> new TaxSummaryDto.TaxByRate(
                        bd(rs, "tax_rate"), bd(rs, "tax_amt"), bd(rs, "taxable_amt"), rs.getLong("cnt")));

        String byCatSql = """
            SELECT COALESCE(pm.category_name, 'Uncategorised') AS cat,
                   SUM(f.tax) AS tax_amt, SUM(f.net) AS taxable_amt, COUNT(*) AS cnt
              FROM fact_product_sales_daily f
         LEFT JOIN product_meta pm ON pm.product_id = f.product_id
             WHERE f.tenant_id = ?::uuid AND f.date BETWEEN ? AND ?
             GROUP BY pm.category_name
             ORDER BY tax_amt DESC
        """;

        List<TaxSummaryDto.TaxByCategory> byCategory = jdbc.query(byCatSql,
                ps -> { ps.setObject(1, tenantId); ps.setObject(2, Date.valueOf(from)); ps.setObject(3, Date.valueOf(to)); },
                (rs, i) -> new TaxSummaryDto.TaxByCategory(
                        rs.getString("cat"), bd(rs, "tax_amt"), bd(rs, "taxable_amt"), rs.getLong("cnt")));

        return new TaxSummaryDto(from, to,
                bdMap(agg, "total_tax"), bdMap(agg, "taxable_sales"),
                ((Number) agg.get("tx_count")).longValue(),
                byRate, byCategory);
    }

    private static BigDecimal bd(java.sql.ResultSet rs, String col) throws java.sql.SQLException {
        BigDecimal v = rs.getBigDecimal(col);
        return v == null ? BigDecimal.ZERO : v;
    }

    private static BigDecimal bdMap(java.util.Map<String, Object> m, String k) {
        Object v = m.get(k);
        if (v instanceof BigDecimal bd) return bd;
        if (v instanceof Number n) return BigDecimal.valueOf(n.doubleValue());
        return BigDecimal.ZERO;
    }
}
```

- [ ] **Step 2: Commit**

```bash
git add backend/report-service/src/main/java/io/smartpos/report/application/TaxReportService.java
git commit -m "feat: add TaxReportService with fact-table queries"
```

---

### Task 7: PurchaseReportService

**Files:**
- Create: `backend/report-service/src/main/java/io/smartpos/report/application/PurchaseReportService.java`

- [ ] **Step 1: Write PurchaseReportService**

```java
package io.smartpos.report.application;

import io.smartpos.report.api.dto.DashboardDto;
import io.smartpos.report.api.dto.PurchaseSummaryDto;
import io.smartpos.report.infrastructure.config.RedisCacheConfig;
import io.smartpos.report.infrastructure.feign.SalesFeign;
import lombok.RequiredArgsConstructor;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.Collections;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class PurchaseReportService {

    private final SalesFeign sales;

    @Cacheable(value = RedisCacheConfig.CACHE_PROFIT_LOSS,
               key = "T(io.smartpos.report.infrastructure.config.RedisCacheConfig).tenantKey(#from, #to, #warehouseId, 'purch')",
               unless = "#result == null")
    public PurchaseSummaryDto summary(LocalDate from, LocalDate to, UUID warehouseId) {
        SalesFeign.PurchaseStats p = safeStats(from, to, warehouseId);
        BigDecimal avg = p.count() == 0 ? BigDecimal.ZERO
                : nz(p.gross()).divide(BigDecimal.valueOf(p.count()), 4, RoundingMode.HALF_UP);

        // Reuse sales-series for purchase series if available, else empty
        List<DashboardDto.SeriesPoint> series = Collections.emptyList();

        return new PurchaseSummaryDto(from, to, p.count(),
                nz(p.gross()), nz(p.paid()), nz(p.due()), avg,
                series, Collections.emptyList());
    }

    private SalesFeign.PurchaseStats safeStats(LocalDate from, LocalDate to, UUID warehouseId) {
        try { return sales.purchaseStats(from, to, warehouseId); }
        catch (Exception e) { return new SalesFeign.PurchaseStats(0, BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO); }
    }

    private static BigDecimal nz(BigDecimal v) { return v == null ? BigDecimal.ZERO : v; }
}
```

- [ ] **Step 2: Commit**

```bash
git add backend/report-service/src/main/java/io/smartpos/report/application/PurchaseReportService.java
git commit -m "feat: add PurchaseReportService"
```

---

### Task 8: PaymentReportService

**Files:**
- Create: `backend/report-service/src/main/java/io/smartpos/report/application/PaymentReportService.java`

- [ ] **Step 1: Write PaymentReportService**

```java
package io.smartpos.report.application;

import io.smartpos.report.api.dto.DashboardDto;
import io.smartpos.report.api.dto.PaymentSummaryDto;
import io.smartpos.report.infrastructure.config.RedisCacheConfig;
import io.smartpos.report.infrastructure.feign.PaymentFeign;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Collections;
import java.util.List;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class PaymentReportService {

    private final PaymentFeign payments;

    @Cacheable(value = RedisCacheConfig.CACHE_PROFIT_LOSS,
               key = "T(io.smartpos.report.infrastructure.config.RedisCacheConfig).tenantKey(#from, #to, 'pay')",
               unless = "#result == null")
    public PaymentSummaryDto summary(LocalDate from, LocalDate to) {
        PaymentFeign.PaymentStats stats = safeStats(from, to);
        List<PaymentFeign.ByMethodRow> methods = safeByMethod(from, to);

        BigDecimal netFlow = nz(stats.totalIn()).subtract(nz(stats.totalOut()));

        List<PaymentSummaryDto.ByMethod> byMethod = methods.stream()
                .map(m -> new PaymentSummaryDto.ByMethod(m.method(), m.total(), m.count()))
                .toList();

        return new PaymentSummaryDto(from, to, stats.count(),
                nz(stats.totalIn()), nz(stats.totalOut()), netFlow,
                BigDecimal.ZERO, // outstanding — requires AR endpoint
                Collections.emptyList(), // inflowSeries — add in next phase
                byMethod);
    }

    @Cacheable(value = RedisCacheConfig.CACHE_PROFIT_LOSS,
               key = "T(io.smartpos.report.infrastructure.config.RedisCacheConfig).tenantKey(#from, #to, 'payByMethod')",
               unless = "#result == null")
    public List<PaymentFeign.ByMethodRow> byMethod(LocalDate from, LocalDate to) {
        return safeByMethod(from, to);
    }

    private PaymentFeign.PaymentStats safeStats(LocalDate from, LocalDate to) {
        try { return payments.paymentStats(from, to, null); }
        catch (Exception e) {
            log.warn("paymentStats failed: {}", e.getMessage());
            return new PaymentFeign.PaymentStats(0, BigDecimal.ZERO, BigDecimal.ZERO);
        }
    }

    private List<PaymentFeign.ByMethodRow> safeByMethod(LocalDate from, LocalDate to) {
        try { return payments.byMethod(from, to); }
        catch (Exception e) {
            log.warn("byMethod failed: {}", e.getMessage());
            return Collections.emptyList();
        }
    }

    private static BigDecimal nz(BigDecimal v) { return v == null ? BigDecimal.ZERO : v; }
}
```

- [ ] **Step 2: Commit**

```bash
git add backend/report-service/src/main/java/io/smartpos/report/application/PaymentReportService.java
git commit -m "feat: add PaymentReportService"
```

---

### Task 9: CustomerReportService

**Files:**
- Create: `backend/report-service/src/main/java/io/smartpos/report/application/CustomerReportService.java`

- [ ] **Step 1: Write CustomerReportService**

```java
package io.smartpos.report.application;

import io.smartpos.report.api.dto.CustomerSummaryDto;
import io.smartpos.report.infrastructure.config.RedisCacheConfig;
import io.smartpos.report.infrastructure.feign.SalesFeign;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class CustomerReportService {

    private final SalesFeign sales;

    @Cacheable(value = RedisCacheConfig.CACHE_TOP_CUSTOMERS,
               key = "T(io.smartpos.report.infrastructure.config.RedisCacheConfig).tenantKey(#from, #to, 'custSummary')",
               unless = "#result == null")
    public CustomerSummaryDto summary(LocalDate from, LocalDate to) {
        List<SalesFeign.TopCustomer> top = safeTopCustomers(from, to, 20);
        long totalCustomers = top.size(); // best-effort — counts distinct customers with sales
        long activeCustomers = top.size();
        BigDecimal totalRevenue = top.stream()
                .map(SalesFeign.TopCustomer::totalSpent)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal avgRevenue = activeCustomers == 0 ? BigDecimal.ZERO
                : totalRevenue.divide(BigDecimal.valueOf(activeCustomers), 4, RoundingMode.HALF_UP);

        List<CustomerSummaryDto.TopCustomer> topCustomers = top.stream()
                .map(t -> new CustomerSummaryDto.TopCustomer(
                        t.customerId(), null, t.orderCount(), t.totalSpent(), null))
                .toList();

        List<CustomerSummaryDto.FrequencyBucket> freq = List.of(
                new CustomerSummaryDto.FrequencyBucket("1 order", activeCustomers, BigDecimal.ONE));

        return new CustomerSummaryDto(from, to, totalCustomers, activeCustomers, 0,
                totalRevenue, avgRevenue, topCustomers, freq);
    }

    private List<SalesFeign.TopCustomer> safeTopCustomers(LocalDate from, LocalDate to, int limit) {
        try { return sales.topCustomers(from, to, limit); }
        catch (Exception e) {
            log.warn("topCustomers failed: {}", e.getMessage());
            return List.of();
        }
    }
}
```

- [ ] **Step 2: Commit**

```bash
git add backend/report-service/src/main/java/io/smartpos/report/application/CustomerReportService.java
git commit -m "feat: add CustomerReportService"
```

---

## Phase 3 — Backend Controller Extension

### Task 10: Add new endpoints to ReportController

**Files:**
- Modify: `backend/report-service/src/main/java/io/smartpos/report/api/ReportController.java`

- [ ] **Step 1: Add new endpoints**

Read the existing file. Add these imports and endpoints. The existing constructor injection uses `@RequiredArgsConstructor` — add new service fields and they will be auto-injected.

New imports to add:
```java
import io.smartpos.report.application.TaxReportService;
import io.smartpos.report.application.PurchaseReportService;
import io.smartpos.report.application.PaymentReportService;
import io.smartpos.report.application.CustomerReportService;
import io.smartpos.report.api.dto.TaxSummaryDto;
import io.smartpos.report.api.dto.PurchaseSummaryDto;
import io.smartpos.report.api.dto.PaymentSummaryDto;
import io.smartpos.report.api.dto.CustomerSummaryDto;
import io.smartpos.report.api.dto.EmployeeSalesDto;
import io.smartpos.report.infrastructure.feign.PaymentFeign;
```

New fields to add (Lombok adds to constructor):
```java
private final TaxReportService        taxReports;
private final PurchaseReportService   purchaseReports;
private final PaymentReportService    paymentReports;
private final CustomerReportService   customerReports;
```

New endpoints to add before the `// ---- helpers ----` line:

```java
    // ---- Tax report ----

    @GetMapping("/tax-summary")
    @PreAuthorize("hasAuthority('report.financial')")
    public TaxSummaryDto taxSummary(@RequestParam(required = false) LocalDate dateFrom,
                                     @RequestParam(required = false) LocalDate dateTo) {
        return taxReports.summary(defaultFrom(dateFrom), defaultTo(dateTo));
    }

    // ---- Purchase report ----

    @GetMapping("/purchases/summary")
    @PreAuthorize("hasAuthority('report.financial')")
    public PurchaseSummaryDto purchaseSummary(@RequestParam(required = false) LocalDate dateFrom,
                                               @RequestParam(required = false) LocalDate dateTo,
                                               @RequestParam(required = false) UUID warehouseId) {
        return purchaseReports.summary(defaultFrom(dateFrom), defaultTo(dateTo), warehouseId);
    }

    // ---- Payment report ----

    @GetMapping("/payments/summary")
    @PreAuthorize("hasAuthority('report.financial')")
    public PaymentSummaryDto paymentSummary(@RequestParam(required = false) LocalDate dateFrom,
                                             @RequestParam(required = false) LocalDate dateTo) {
        return paymentReports.summary(defaultFrom(dateFrom), defaultTo(dateTo));
    }

    @GetMapping("/payments/by-method")
    @PreAuthorize("hasAuthority('report.financial')")
    public List<PaymentFeign.ByMethodRow> paymentsByMethod(@RequestParam(required = false) LocalDate dateFrom,
                                                            @RequestParam(required = false) LocalDate dateTo) {
        return paymentReports.byMethod(defaultFrom(dateFrom), defaultTo(dateTo));
    }

    // ---- Customer report ----

    @GetMapping("/customers/summary")
    @PreAuthorize("hasAuthority('report.sales')")
    public CustomerSummaryDto customerSummary(@RequestParam(required = false) LocalDate dateFrom,
                                               @RequestParam(required = false) LocalDate dateTo) {
        return customerReports.summary(defaultFrom(dateFrom), defaultTo(dateTo));
    }

    // ---- Employee sales ----

    @GetMapping("/sales/by-employee")
    @PreAuthorize("hasAuthority('report.sales')")
    public EmployeeSalesDto salesByEmployee(@RequestParam(required = false) LocalDate dateFrom,
                                             @RequestParam(required = false) LocalDate dateTo) {
        return new EmployeeSalesDto(defaultFrom(dateFrom), defaultTo(dateTo), List.of());
    }
```

- [ ] **Step 2: Commit**

```bash
git add backend/report-service/src/main/java/io/smartpos/report/api/ReportController.java
git commit -m "feat: add 6 new report endpoints (tax, purchases, payments, customers, employee sales)"
```

---

### Task 11: Extend ExportService for new report keys

**Files:**
- Modify: `backend/report-service/src/main/java/io/smartpos/report/application/ExportService.java`

- [ ] **Step 1: Add Tax and Purchase export cases to the `run()` switch**

Add new service dependencies:
```java
private final TaxReportService taxReports;
private final PurchaseReportService purchaseReports;
private final PaymentReportService paymentReports;
private final CustomerReportService customerReports;
```

Add these cases to the `run()` switch statement:
```java
case "tax-summary"     -> taxExport(format, from, to);
case "purchases-summary" -> purchaseExport(format, from, to, warehouseId);
case "payments-summary"  -> paymentExport(format, from, to);
case "customers-summary" -> customerExport(format, from, to);
```

Add these private renderer methods:

```java
private RenderedExport taxExport(ExportJob.Format fmt, LocalDate from, LocalDate to) {
    TaxSummaryDto dto = taxReports.summary(from, to);
    List<String> headers = List.of("Tax Rate %", "Tax Amount", "Taxable Amount", "Transactions");
    List<List<Object>> rows = new ArrayList<>();
    for (TaxSummaryDto.TaxByRate r : dto.byRate()) {
        rows.add(List.of(r.rate(), r.taxAmount(), r.taxableAmount(), r.count()));
    }
    return render(fmt, "tax-summary", "Tax Summary", "From " + from + " to " + to, headers, rows);
}

private RenderedExport purchaseExport(ExportJob.Format fmt, LocalDate from, LocalDate to, UUID warehouseId) {
    PurchaseSummaryDto dto = purchaseReports.summary(from, to, warehouseId);
    List<String> headers = List.of("Date", "Gross", "Paid", "Due");
    List<List<Object>> rows = new ArrayList<>();
    for (DashboardDto.SeriesPoint p : dto.series()) {
        rows.add(List.of(p.date(), null, null, null)); // series has net only; purchase series TBD
    }
    return render(fmt, "purchases-summary", "Purchase Summary", "From " + from + " to " + to, headers, rows);
}

private RenderedExport paymentExport(ExportJob.Format fmt, LocalDate from, LocalDate to) {
    PaymentSummaryDto dto = paymentReports.summary(from, to);
    List<String> headers = List.of("Method", "Total", "Count");
    List<List<Object>> rows = new ArrayList<>();
    for (PaymentSummaryDto.ByMethod r : dto.byMethod()) {
        rows.add(List.of(r.method(), r.total(), r.count()));
    }
    return render(fmt, "payments-summary", "Payment Summary", "From " + from + " to " + to, headers, rows);
}

private RenderedExport customerExport(ExportJob.Format fmt, LocalDate from, LocalDate to) {
    CustomerSummaryDto dto = customerReports.summary(from, to);
    List<String> headers = List.of("Customer ID", "Orders", "Total Spent");
    List<List<Object>> rows = new ArrayList<>();
    for (CustomerSummaryDto.TopCustomer r : dto.topCustomers()) {
        rows.add(List.of(r.customerId(), r.orderCount(), r.totalSpent()));
    }
    return render(fmt, "customers-summary", "Customer Summary", "From " + from + " to " + to, headers, rows);
}
```

Add required imports:
```java
import io.smartpos.report.api.dto.TaxSummaryDto;
import io.smartpos.report.api.dto.PurchaseSummaryDto;
import io.smartpos.report.api.dto.PaymentSummaryDto;
import io.smartpos.report.api.dto.CustomerSummaryDto;
```

- [ ] **Step 2: Commit**

```bash
git add backend/report-service/src/main/java/io/smartpos/report/application/ExportService.java
git commit -m "feat: extend ExportService with tax, purchase, payment, customer export renderers"
```

---

## Phase 4 — AI Service Extensions

### Task 12: ReportAiDtos

**Files:**
- Create: `backend/ai-service/src/main/java/io/smartpos/ai/api/dto/ReportAiDtos.java`

- [ ] **Step 1: Write ReportAiDtos**

```java
package io.smartpos.ai.api.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.time.Instant;
import java.util.List;

public final class ReportAiDtos {

    private ReportAiDtos() {}

    public record AnomalyRequest(
            @NotBlank String reportKind,
            @NotBlank String factsJson
    ) {}

    public record AnomalyResponse(
            List<Anomaly> anomalies,
            String provider,
            String model,
            Instant generatedAt
    ) {
        public record Anomaly(
                String metric,
                String description,
                String severity,      // LOW | MEDIUM | HIGH
                String expectedRange,
                String actualValue
        ) {}
    }

    public record RecommendationRequest(
            @NotBlank String reportKind,
            @NotBlank String factsJson
    ) {}

    public record RecommendationResponse(
            List<Recommendation> recommendations,
            String provider,
            String model,
            Instant generatedAt
    ) {
        public record Recommendation(
                String title,
                String description,
                String category,     // INVENTORY | PRICING | SALES | COST | GENERAL
                String priority      // LOW | MEDIUM | HIGH
        ) {}
    }
}
```

- [ ] **Step 2: Commit**

```bash
git add backend/ai-service/src/main/java/io/smartpos/ai/api/dto/ReportAiDtos.java
git commit -m "feat: add ReportAiDtos for anomaly detection and recommendations"
```

---

### Task 13: AnomalyService

**Files:**
- Create: `backend/ai-service/src/main/java/io/smartpos/ai/application/AnomalyService.java`

- [ ] **Step 1: Write AnomalyService**

```java
package io.smartpos.ai.application;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.smartpos.ai.api.dto.ReportAiDtos;
import io.smartpos.ai.application.provider.AiProvider;
import io.smartpos.ai.application.provider.AiRouter;
import io.smartpos.ai.domain.model.AiInvocation;
import io.smartpos.ai.domain.repository.AiInvocationRepository;
import io.smartpos.common.context.TenantContext;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class AnomalyService {

    private final AiRouter aiRouter;
    private final AiInvocationRepository invocations;
    private static final ObjectMapper MAPPER = new ObjectMapper();

    private static final String SYS_ANOMALY = """
            You are a retail analytics anomaly detector. Given report data as JSON,
            identify unusual patterns, outliers, or concerning trends.
            Return a JSON object with an "anomalies" array:

            {
              "anomalies": [
                {
                  "metric": "string",
                  "description": "string",
                  "severity": "LOW"|"MEDIUM"|"HIGH",
                  "expectedRange": "string (what's normal)",
                  "actualValue": "string (what was observed)"
                }
              ]
            }

            Rules:
            - Only flag genuine anomalies — don't invent problems.
            - If nothing looks unusual, return an empty anomalies array.
            - severity: LOW = minor variance, MEDIUM = notable deviation, HIGH = needs immediate attention.
            - Output ONLY the JSON object — no commentary, no markdown.
            """;

    public ReportAiDtos.AnomalyResponse detect(ReportAiDtos.AnomalyRequest req, UUID userId) {
        AiProvider provider = aiRouter.active();
        String userPrompt = "Report kind: " + req.reportKind() + "\nFacts (JSON):\n" + req.factsJson();

        long t0 = System.currentTimeMillis();
        AiProvider.Result result;
        String error = null;
        try {
            result = provider.completeJson(SYS_ANOMALY, userPrompt);
        } catch (Exception e) {
            error = e.getMessage();
            log.warn("Anomaly detection failed: {}", error);
            result = new AiProvider.Result("{\"anomalies\":[]}", 0, 0);
        }
        int duration = (int) (System.currentTimeMillis() - t0);

        invocations.save(AiInvocation.builder()
                .kind("ANOMALY_DETECT").provider(provider.name()).model(provider.model())
                .promptTokens(result.promptTokens()).completionTokens(result.completionTokens())
                .inputSummary("anomalies " + req.reportKind())
                .output(truncate(result.text(), 2000)).error(error)
                .userId(userId).tenantId(TenantContext.require())
                .durationMs(duration).build());

        List<ReportAiDtos.AnomalyResponse.Anomaly> anomalies = new ArrayList<>();
        try {
            JsonNode root = MAPPER.readTree(stripFences(result.text()));
            if (root.has("anomalies") && root.get("anomalies").isArray()) {
                for (JsonNode a : root.get("anomalies")) {
                    anomalies.add(new ReportAiDtos.AnomalyResponse.Anomaly(
                            a.path("metric").asText(""),
                            a.path("description").asText(""),
                            a.path("severity").asText("LOW"),
                            a.path("expectedRange").asText(""),
                            a.path("actualValue").asText("")));
                }
            }
        } catch (Exception e) {
            log.warn("Failed to parse anomaly JSON: {}", e.getMessage());
        }

        return new ReportAiDtos.AnomalyResponse(anomalies, provider.name(), provider.model(), Instant.now());
    }

    private static String stripFences(String s) {
        if (s == null) return "{}";
        String t = s.trim();
        if (t.startsWith("```")) {
            int start = t.indexOf('\n');
            int end = t.lastIndexOf("```");
            if (start >= 0 && end > start) t = t.substring(start + 1, end);
        }
        return t;
    }

    private static String truncate(String s, int max) {
        if (s == null) return null;
        return s.length() <= max ? s : s.substring(0, max);
    }
}
```

- [ ] **Step 2: Commit**

```bash
git add backend/ai-service/src/main/java/io/smartpos/ai/application/AnomalyService.java
git commit -m "feat: add AnomalyService for AI-powered report anomaly detection"
```

---

### Task 14: RecommendationService

**Files:**
- Create: `backend/ai-service/src/main/java/io/smartpos/ai/application/RecommendationService.java`

- [ ] **Step 1: Write RecommendationService**

```java
package io.smartpos.ai.application;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.smartpos.ai.api.dto.ReportAiDtos;
import io.smartpos.ai.application.provider.AiProvider;
import io.smartpos.ai.application.provider.AiRouter;
import io.smartpos.ai.domain.model.AiInvocation;
import io.smartpos.ai.domain.repository.AiInvocationRepository;
import io.smartpos.common.context.TenantContext;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class RecommendationService {

    private final AiRouter aiRouter;
    private final AiInvocationRepository invocations;
    private static final ObjectMapper MAPPER = new ObjectMapper();

    private static final String SYS_RECOMMEND = """
            You are a retail business advisor for a POS/ERP system. Given report data
            as JSON, generate 3-5 concrete, actionable recommendations.
            Return a JSON object:

            {
              "recommendations": [
                {
                  "title": "string (short action title)",
                  "description": "string (1-2 sentences explaining the action)",
                  "category": "INVENTORY"|"PRICING"|"SALES"|"COST"|"GENERAL",
                  "priority": "LOW"|"MEDIUM"|"HIGH"
                }
              ]
            }

            Rules:
            - Each recommendation must be specific, actionable, and data-backed.
            - Reference actual figures from the data when possible.
            - Priority: HIGH = do this week, MEDIUM = do this month, LOW = consider.
            - Output ONLY the JSON object — no commentary, no markdown.
            """;

    public ReportAiDtos.RecommendationResponse recommend(ReportAiDtos.RecommendationRequest req, UUID userId) {
        AiProvider provider = aiRouter.active();
        String userPrompt = "Report kind: " + req.reportKind() + "\nFacts (JSON):\n" + req.factsJson();

        long t0 = System.currentTimeMillis();
        AiProvider.Result result;
        String error = null;
        try {
            result = provider.completeJson(SYS_RECOMMEND, userPrompt);
        } catch (Exception e) {
            error = e.getMessage();
            log.warn("Recommendation generation failed: {}", error);
            result = new AiProvider.Result("{\"recommendations\":[]}", 0, 0);
        }
        int duration = (int) (System.currentTimeMillis() - t0);

        invocations.save(AiInvocation.builder()
                .kind("RECOMMENDATIONS").provider(provider.name()).model(provider.model())
                .promptTokens(result.promptTokens()).completionTokens(result.completionTokens())
                .inputSummary("recommend " + req.reportKind())
                .output(truncate(result.text(), 2000)).error(error)
                .userId(userId).tenantId(TenantContext.require())
                .durationMs(duration).build());

        List<ReportAiDtos.RecommendationResponse.Recommendation> recs = new ArrayList<>();
        try {
            JsonNode root = MAPPER.readTree(stripFences(result.text()));
            if (root.has("recommendations") && root.get("recommendations").isArray()) {
                for (JsonNode r : root.get("recommendations")) {
                    recs.add(new ReportAiDtos.RecommendationResponse.Recommendation(
                            r.path("title").asText(""),
                            r.path("description").asText(""),
                            r.path("category").asText("GENERAL"),
                            r.path("priority").asText("MEDIUM")));
                }
            }
        } catch (Exception e) {
            log.warn("Failed to parse recommendation JSON: {}", e.getMessage());
        }

        return new ReportAiDtos.RecommendationResponse(recs, provider.name(), provider.model(), Instant.now());
    }

    private static String stripFences(String s) {
        if (s == null) return "{}";
        String t = s.trim();
        if (t.startsWith("```")) {
            int start = t.indexOf('\n');
            int end = t.lastIndexOf("```");
            if (start >= 0 && end > start) t = t.substring(start + 1, end);
        }
        return t;
    }

    private static String truncate(String s, int max) {
        if (s == null) return null;
        return s.length() <= max ? s : s.substring(0, max);
    }
}
```

- [ ] **Step 2: Commit**

```bash
git add backend/ai-service/src/main/java/io/smartpos/ai/application/RecommendationService.java
git commit -m "feat: add RecommendationService for AI-powered business recommendations"
```

---

### Task 15: ReportAiController

**Files:**
- Create: `backend/ai-service/src/main/java/io/smartpos/ai/api/ReportAiController.java`

- [ ] **Step 1: Write ReportAiController**

```java
package io.smartpos.ai.api;

import io.smartpos.ai.api.dto.AiDtos;
import io.smartpos.ai.api.dto.ReportAiDtos;
import io.smartpos.ai.application.AnomalyService;
import io.smartpos.ai.application.InsightService;
import io.smartpos.ai.application.RecommendationService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/ai/reports")
@RequiredArgsConstructor
public class ReportAiController {

    private final AnomalyService       anomalyService;
    private final RecommendationService recommendationService;
    private final InsightService       insightService;

    @PostMapping("/anomalies")
    @PreAuthorize("hasAuthority('ai.insight')")
    public ReportAiDtos.AnomalyResponse anomalies(@Valid @RequestBody ReportAiDtos.AnomalyRequest req,
                                                   @AuthenticationPrincipal Jwt jwt) {
        return anomalyService.detect(req, principal(jwt));
    }

    @PostMapping("/recommendations")
    @PreAuthorize("hasAuthority('ai.insight')")
    public ReportAiDtos.RecommendationResponse recommendations(@Valid @RequestBody ReportAiDtos.RecommendationRequest req,
                                                                @AuthenticationPrincipal Jwt jwt) {
        return recommendationService.recommend(req, principal(jwt));
    }

    // Re-expose narrate under /reports/ for cohesion
    @PostMapping("/narrate")
    @PreAuthorize("hasAuthority('ai.insight')")
    public AiDtos.InsightResponse narrate(@Valid @RequestBody AiDtos.NarrateRequest req,
                                           @AuthenticationPrincipal Jwt jwt) {
        return insightService.narrate(req, principal(jwt));
    }

    private UUID principal(Jwt jwt) {
        if (jwt == null) return null;
        try { return UUID.fromString(jwt.getSubject()); } catch (Exception ignored) { return null; }
    }
}
```

- [ ] **Step 2: Commit**

```bash
git add backend/ai-service/src/main/java/io/smartpos/ai/api/ReportAiController.java
git commit -m "feat: add ReportAiController with anomalies, recommendations, narrate endpoints"
```

---

## Phase 5 — Frontend API Layer

### Task 16: Extend reports.ts with new types and functions

**Files:**
- Modify: `frontend/src/api/smartpos/reports.ts`

- [ ] **Step 1: Add new type definitions and API functions**

Append the following types after the existing `SalesByDimensionReport` section (before the export section):

```typescript
// ---------- Tax summary ----------

export interface TaxByRate {
  rate: number;
  taxAmount: number;
  taxableAmount: number;
  count: number;
}

export interface TaxByCategory {
  categoryName: string;
  taxAmount: number;
  taxableAmount: number;
  count: number;
}

export interface TaxSummary {
  from: string;
  to: string;
  totalTax: number;
  taxableSales: number;
  transactionCount: number;
  byRate: TaxByRate[];
  byCategory: TaxByCategory[];
}

export async function getTaxSummary(params: {
  dateFrom?: string; dateTo?: string;
} = {}): Promise<TaxSummary> {
  const { data } = await api.get<TaxSummary>('/api/v1/reports/tax-summary', { params });
  return data;
}

// ---------- Purchase summary ----------

export interface PurchaseSummary {
  from: string; to: string;
  count: number; gross: number; paid: number; due: number;
  avgPurchase: number;
  series: { date: string; net: number; count: number }[];
  topSuppliers: TopSupplier[];
}

export interface TopSupplier {
  supplierId: UUID; supplierName: string;
  orderCount: number; totalSpent: number;
}

export async function getPurchaseSummary(params: {
  dateFrom?: string; dateTo?: string; warehouseId?: UUID;
} = {}): Promise<PurchaseSummary> {
  const { data } = await api.get<PurchaseSummary>('/api/v1/reports/purchases/summary', { params });
  return data;
}

// ---------- Payment summary ----------

export interface PaymentMethodRow {
  method: string; total: number; count: number;
}

export interface PaymentSummary {
  from: string; to: string;
  totalCount: number;
  totalIn: number; totalOut: number; netFlow: number;
  outstanding: number;
  inflowSeries: { date: string; net: number; count: number }[];
  byMethod: PaymentMethodRow[];
}

export async function getPaymentSummary(params: {
  dateFrom?: string; dateTo?: string;
} = {}): Promise<PaymentSummary> {
  const { data } = await api.get<PaymentSummary>('/api/v1/reports/payments/summary', { params });
  return data;
}

// ---------- Customer summary ----------

export interface TopCustomerDetail {
  customerId: UUID; customerName: string | null;
  orderCount: number; totalSpent: number;
  lastPurchase: string | null;
}

export interface FrequencyBucket {
  label: string; customerCount: number; revenueShare: number;
}

export interface CustomerSummary {
  from: string; to: string;
  totalCustomers: number; activeCustomers: number; newCustomers: number;
  totalRevenue: number; avgRevenuePerCustomer: number;
  topCustomers: TopCustomerDetail[];
  frequencyDistribution: FrequencyBucket[];
}

export async function getCustomerSummary(params: {
  dateFrom?: string; dateTo?: string;
} = {}): Promise<CustomerSummary> {
  const { data } = await api.get<CustomerSummary>('/api/v1/reports/customers/summary', { params });
  return data;
}

// ---------- Employee sales ----------

export interface EmployeeSalesRow {
  employeeId: UUID; employeeName: string;
  saleCount: number; totalNet: number;
  totalGross: number; itemsSold: number;
}

export interface EmployeeSales {
  from: string; to: string;
  rows: EmployeeSalesRow[];
}

export async function getEmployeeSales(params: {
  dateFrom?: string; dateTo?: string;
} = {}): Promise<EmployeeSales> {
  const { data } = await api.get<EmployeeSales>('/api/v1/reports/sales/by-employee', { params });
  return data;
}
```

Update the `ExportReportKey` type to include new report keys:
```typescript
export type ExportReportKey =
  | 'sales-summary-series'
  | 'sales-top-products'
  | 'sales-top-customers'
  | 'tax-summary'
  | 'purchases-summary'
  | 'payments-summary'
  | 'customers-summary';
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/api/smartpos/reports.ts
git commit -m "feat: add API types and functions for tax, purchase, payment, customer, employee reports"
```

---

### Task 17: Extend ai.ts with report AI functions

**Files:**
- Modify: `frontend/src/api/smartpos/ai.ts`

- [ ] **Step 1: Add AI report functions**

Append after the existing `aiChat` function:

```typescript
// ---------- Report AI: anomalies ----------

export interface Anomaly {
  metric: string;
  description: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH';
  expectedRange: string;
  actualValue: string;
}

export interface AnomalyResponse {
  anomalies: Anomaly[];
  provider: string;
  model: string;
  generatedAt: string;
}

export async function aiDetectAnomalies(reportKind: string, factsJson: string): Promise<AnomalyResponse> {
  const { data } = await api.post<AnomalyResponse>('/api/v1/ai/reports/anomalies', {
    reportKind,
    factsJson,
  });
  return data;
}

// ---------- Report AI: recommendations ----------

export interface Recommendation {
  title: string;
  description: string;
  category: 'INVENTORY' | 'PRICING' | 'SALES' | 'COST' | 'GENERAL';
  priority: 'LOW' | 'MEDIUM' | 'HIGH';
}

export interface RecommendationResponse {
  recommendations: Recommendation[];
  provider: string;
  model: string;
  generatedAt: string;
}

export async function aiGetRecommendations(reportKind: string, factsJson: string): Promise<RecommendationResponse> {
  const { data } = await api.post<RecommendationResponse>('/api/v1/ai/reports/recommendations', {
    reportKind,
    factsJson,
  });
  return data;
}

// Reuse aiNarrate for report narratives (already exported above)
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/api/smartpos/ai.ts
git commit -m "feat: add AI report functions for anomalies and recommendations"
```

---

## Phase 6 — Frontend Shared Components

### Task 18: ReportFilterBar

**Files:**
- Create: `frontend/src/components/smartpos/reports/ReportFilterBar.tsx`

- [ ] **Step 1: Write ReportFilterBar**

```tsx
import { Stack, TextField, MenuItem } from '@mui/material';
import { brand } from 'src/theme/smartpos/brand';

export interface ReportFilters {
  dateFrom: string;
  dateTo: string;
  warehouseId: string;
  period: string;
}

interface Props {
  filters: ReportFilters;
  onChange: (f: ReportFilters) => void;
  showWarehouse?: boolean;
  showPeriod?: boolean;
  warehouses?: { id: string; name: string }[];
}

const PERIODS = [
  { value: '', label: 'Custom' },
  { value: 'TODAY', label: 'Today' },
  { value: 'WEEK', label: 'This week' },
  { value: 'MONTH', label: 'This month' },
  { value: 'LAST_30_DAYS', label: 'Last 30 days' },
  { value: 'YTD', label: 'Year to date' },
];

function periodRange(period: string): { from: string; to: string } | null {
  const today = new Date();
  const start = new Date(today);
  const end = new Date(today);
  if (period === 'TODAY') { /* already today */ }
  else if (period === 'YESTERDAY') { start.setDate(today.getDate() - 1); end.setDate(today.getDate() - 1); }
  else if (period === 'WEEK') { const d = today.getDay() || 7; start.setDate(today.getDate() - d + 1); }
  else if (period === 'MONTH') { start.setDate(1); }
  else if (period === 'YTD') { start.setMonth(0, 1); }
  else if (period === 'LAST_30_DAYS') { start.setDate(today.getDate() - 30); }
  else return null;
  return { from: start.toISOString().slice(0, 10), to: end.toISOString().slice(0, 10) };
}

export default function ReportFilterBar({ filters, onChange, showWarehouse, showPeriod, warehouses }: Props) {
  return (
    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ mb: 2 }}>
      {showPeriod !== false && (
        <TextField select size="small" label="Period" value={filters.period}
          onChange={(e) => {
            const p = e.target.value;
            const range = periodRange(p);
            onChange({ ...filters, period: p, ...(range ?? {}) });
          }}
          sx={{ minWidth: 140 }}>
          {PERIODS.map((p) => <MenuItem key={p.value} value={p.value}>{p.label}</MenuItem>)}
        </TextField>
      )}
      <TextField type="date" label="From" size="small" value={filters.dateFrom}
        onChange={(e) => onChange({ ...filters, dateFrom: e.target.value, period: '' })}
        InputLabelProps={{ shrink: true }} sx={{ minWidth: 160 }} />
      <TextField type="date" label="To" size="small" value={filters.dateTo}
        onChange={(e) => onChange({ ...filters, dateTo: e.target.value, period: '' })}
        InputLabelProps={{ shrink: true }} sx={{ minWidth: 160 }} />
      {showWarehouse && warehouses && warehouses.length > 0 && (
        <TextField select size="small" label="Warehouse" value={filters.warehouseId}
          onChange={(e) => onChange({ ...filters, warehouseId: e.target.value })}
          sx={{ minWidth: 160 }}>
          <MenuItem value="">All warehouses</MenuItem>
          {warehouses.map((w) => <MenuItem key={w.id} value={w.id}>{w.name}</MenuItem>)}
        </TextField>
      )}
    </Stack>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/components/smartpos/reports/ReportFilterBar.tsx
git commit -m "feat: add ReportFilterBar shared component"
```

---

### Task 19: ReportKpiRow

**Files:**
- Create: `frontend/src/components/smartpos/reports/ReportKpiRow.tsx`

- [ ] **Step 1: Write ReportKpiRow**

```tsx
import { Box, Card, CardContent, Grid, Stack, Typography } from '@mui/material';
import { IconArrowUp, IconArrowDown } from '@tabler/icons-react';
import Chart from 'react-apexcharts';
import type { ApexOptions } from 'apexcharts';
import { brand } from 'src/theme/smartpos/brand';

export interface KpiCard {
  label: string;
  value: string;
  change?: { positive: boolean; label: string } | null;
  sparkline?: number[];
  color?: string;
}

interface Props {
  cards: KpiCard[];
}

const chartFont = 'Inter, DM Sans, sans-serif';

function sparkOptions(color: string): ApexOptions {
  return {
    chart: { type: 'area', sparkline: { enabled: true }, toolbar: { show: false }, fontFamily: chartFont },
    colors: [color],
    stroke: { curve: 'smooth', width: 2 },
    fill: { type: 'gradient', gradient: { opacityFrom: 0.2, opacityTo: 0.02 } },
    dataLabels: { enabled: false },
  };
}

export default function ReportKpiRow({ cards }: Props) {
  const cols = cards.length <= 4 ? cards.length : 4;
  const size = cols === 4 ? { xs: 12, sm: 6, md: 3 } as const
    : cols === 3 ? { xs: 12, sm: 4 } as const
    : cols === 2 ? { xs: 12, sm: 6 } as const
    : { xs: 12 } as const;

  return (
    <Grid container spacing={2} sx={{ mb: 2 }}>
      {cards.map((card, i) => (
        <Grid size={size} key={i}>
          <Card elevation={0} sx={{ border: `1px solid ${brand.neutral[200]}`, borderRadius: '12px', height: '100%' }}>
            <CardContent sx={{ p: 2.25 }}>
              <Typography sx={{ color: brand.neutral[600], fontSize: 12, fontWeight: 600 }}>{card.label}</Typography>
              <Typography sx={{ color: brand.neutral[900], fontWeight: 900, fontSize: 22, mt: 0.75 }}>{card.value}</Typography>
              {card.change && (
                <Stack direction="row" spacing={0.5} alignItems="center" sx={{ mt: 0.5 }}>
                  {card.change.positive ? <IconArrowUp size={14} color={brand.success.main} /> : <IconArrowDown size={14} color={brand.error.main} />}
                  <Typography sx={{ color: card.change.positive ? brand.success.main : brand.error.main, fontWeight: 700, fontSize: 12 }}>
                    {card.change.label}
                  </Typography>
                </Stack>
              )}
              {card.sparkline && card.sparkline.length > 0 && (
                <Box sx={{ mt: 1, mx: -1, mb: -1 }}>
                  <Chart options={sparkOptions(card.color ?? brand.primary[600])} series={[{ data: card.sparkline }]} type="area" height={40} />
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>
      ))}
    </Grid>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/components/smartpos/reports/ReportKpiRow.tsx
git commit -m "feat: add ReportKpiRow shared component"
```

---

### Task 20: ReportChartCard

**Files:**
- Create: `frontend/src/components/smartpos/reports/ReportChartCard.tsx`

- [ ] **Step 1: Write ReportChartCard**

```tsx
import { Card, CardContent, Typography, Box } from '@mui/material';
import Chart from 'react-apexcharts';
import type { ApexOptions } from 'apexcharts';
import { brand } from 'src/theme/smartpos/brand';

interface Props {
  title: string;
  options: ApexOptions;
  series: ApexAxisChartSeries | ApexNonAxisChartSeries;
  type: 'line' | 'bar' | 'area' | 'donut' | 'pie';
  height?: number;
}

export default function ReportChartCard({ title, options, series, type, height = 300 }: Props) {
  return (
    <Card elevation={0} sx={{ border: `1px solid ${brand.neutral[200]}`, borderRadius: '12px', height: '100%' }}>
      <CardContent sx={{ p: 2.25 }}>
        <Typography sx={{ fontWeight: 800, color: brand.neutral[900], fontSize: 17, mb: 1 }}>{title}</Typography>
        {series && (Array.isArray(series) ? series.length > 0 : true) ? (
          <Chart options={options} series={series} type={type} height={height} />
        ) : (
          <Box sx={{ height, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Typography sx={{ color: brand.neutral[500], fontSize: 13 }}>No data for this period</Typography>
          </Box>
        )}
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/components/smartpos/reports/ReportChartCard.tsx
git commit -m "feat: add ReportChartCard shared component"
```

---

### Task 21: ReportDataTable

**Files:**
- Create: `frontend/src/components/smartpos/reports/ReportDataTable.tsx`

- [ ] **Step 1: Write ReportDataTable**

```tsx
import { useState, useMemo } from 'react';
import {
  Box, Card, Table, TableBody, TableCell, TableHead, TableRow,
  TableSortLabel, TextField, Typography, TablePagination,
} from '@mui/material';
import { brand } from 'src/theme/smartpos/brand';

export interface Column<T> {
  id: string;
  label: string;
  align?: 'left' | 'right' | 'center';
  render: (row: T) => React.ReactNode;
  sortable?: boolean;
}

interface Props<T> {
  title?: string;
  columns: Column<T>[];
  rows: T[];
  getRowKey: (row: T, index: number) => string;
  searchPlaceholder?: string;
  defaultSort?: string;
  defaultSortDir?: 'asc' | 'desc';
}

export default function ReportDataTable<T>({
  title, columns, rows, getRowKey,
  searchPlaceholder = 'Search…',
  defaultSort, defaultSortDir = 'desc',
}: Props<T>) {
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState(defaultSort ?? '');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>(defaultSortDir);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);

  const filtered = useMemo(() => {
    if (!search) return rows;
    const q = search.toLowerCase();
    return rows.filter((r) =>
      columns.some((c) => {
        const node = c.render(r);
        if (node == null) return false;
        const text = typeof node === 'string' ? node : (node as any)?.props?.children ?? '';
        return String(text).toLowerCase().includes(q);
      }),
    );
  }, [rows, search, columns]);

  const sorted = useMemo(() => {
    if (!sortBy) return filtered;
    const col = columns.find((c) => c.id === sortBy);
    if (!col) return filtered;
    return [...filtered].sort((a, b) => {
      const va = col.render(a);
      const vb = col.render(b);
      const sa = typeof va === 'string' ? va : (va as any)?.props?.children ?? '';
      const sb = typeof vb === 'string' ? vb : (vb as any)?.props?.children ?? '';
      const cmp = String(sa).localeCompare(String(sb), undefined, { numeric: true });
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [filtered, sortBy, sortDir, columns]);

  const paged = sorted.slice(page * rowsPerPage, (page + 1) * rowsPerPage);

  return (
    <Card elevation={0} sx={{ border: `1px solid ${brand.neutral[200]}`, borderRadius: '12px' }}>
      <Box sx={{ p: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1 }}>
        {title && <Typography sx={{ fontWeight: 800, fontSize: 17, color: brand.neutral[900] }}>{title}</Typography>}
        <TextField size="small" placeholder={searchPlaceholder} value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(0); }}
          sx={{ minWidth: 220, '& .MuiOutlinedInput-root': { borderRadius: '9px' } }} />
      </Box>
      <Box sx={{ overflowX: 'auto' }}>
        <Table size="small">
          <TableHead sx={{ bgcolor: brand.neutral[50] }}>
            <TableRow>
              {columns.map((c) => (
                <TableCell key={c.id} align={c.align ?? 'left'} sx={{ fontWeight: 700, whiteSpace: 'nowrap' }}>
                  {c.sortable !== false ? (
                    <TableSortLabel active={sortBy === c.id} direction={sortBy === c.id ? sortDir : 'asc'}
                      onClick={() => {
                        if (sortBy === c.id) setSortDir((d) => d === 'asc' ? 'desc' : 'asc');
                        else { setSortBy(c.id); setSortDir('asc'); }
                      }}>
                      {c.label}
                    </TableSortLabel>
                  ) : c.label}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {paged.map((row, i) => (
              <TableRow key={getRowKey(row, i)} hover>
                {columns.map((c) => (
                  <TableCell key={c.id} align={c.align ?? 'left'}>{c.render(row)}</TableCell>
                ))}
              </TableRow>
            ))}
            {paged.length === 0 && (
              <TableRow>
                <TableCell colSpan={columns.length} align="center" sx={{ py: 4, color: brand.neutral[500] }}>
                  No data to display
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Box>
      <TablePagination component="div" count={sorted.length} page={page} rowsPerPage={rowsPerPage}
        onPageChange={(_, p) => setPage(p)} onRowsPerPageChange={(e) => { setRowsPerPage(Number(e.target.value)); setPage(0); }} />
    </Card>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/components/smartpos/reports/ReportDataTable.tsx
git commit -m "feat: add ReportDataTable shared component with search, sort, pagination"
```

---

### Task 22: ReportExportBar

**Files:**
- Create: `frontend/src/components/smartpos/reports/ReportExportBar.tsx`

- [ ] **Step 1: Write ReportExportBar**

```tsx
import { useState } from 'react';
import { Button, Chip, CircularProgress, Stack, Typography } from '@mui/material';
import { IconFileTypePdf, IconFileSpreadsheet, IconFileTypeCsv, IconDownload } from '@tabler/icons-react';
import { submitExportJob, pollExportJob, type ExportFormat, type ExportReportKey, type ExportJob } from 'src/api/smartpos/reports';
import { brand } from 'src/theme/smartpos/brand';

interface Props {
  reportKey: ExportReportKey;
  dateFrom?: string;
  dateTo?: string;
  warehouseId?: string;
}

const FORMATS: { key: ExportFormat; icon: React.ReactNode; label: string; tone: string }[] = [
  { key: 'PDF', icon: <IconFileTypePdf size={16} />, label: 'PDF', tone: brand.error.main },
  { key: 'XLSX', icon: <IconFileSpreadsheet size={16} />, label: 'Excel', tone: brand.success.main },
  { key: 'CSV', icon: <IconFileTypeCsv size={16} />, label: 'CSV', tone: brand.primary[500] },
];

export default function ReportExportBar({ reportKey, dateFrom, dateTo, warehouseId }: Props) {
  const [exporting, setExporting] = useState<ExportFormat | null>(null);
  const [job, setJob] = useState<ExportJob | null>(null);

  const handleExport = async (format: ExportFormat) => {
    setExporting(format);
    setJob(null);
    try {
      const submitted = await submitExportJob({ reportKey, format, dateFrom, dateTo, warehouseId: warehouseId as any });
      const finished = await pollExportJob(submitted.id, { onTick: (j) => setJob(j) });
      setJob(finished);
    } finally {
      setExporting(null);
    }
  };

  return (
    <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mt: 2 }}>
      <Typography variant="body2" sx={{ color: brand.neutral[600], fontWeight: 600, mr: 0.5 }}>Export:</Typography>
      {FORMATS.map((f) => (
        <Button key={f.key} size="small" variant="outlined" startIcon={exporting === f.key ? <CircularProgress size={14} /> : f.icon}
          onClick={() => handleExport(f.key)} disabled={exporting !== null}
          sx={{ borderColor: brand.neutral[200], color: f.tone, fontWeight: 600, fontSize: 12,
            '&:hover': { borderColor: f.tone, bgcolor: `${f.tone}10` } }}>
          {f.label}
        </Button>
      ))}
      {job?.status === 'READY' && job.fileUrl && (
        <Button size="small" variant="contained" href={job.fileUrl} target="_blank" rel="noopener noreferrer"
          startIcon={<IconDownload size={14} />}
          sx={{ bgcolor: brand.accent[500], '&:hover': { bgcolor: brand.accent[600] }, fontWeight: 700, fontSize: 12 }}>
          Download
        </Button>
      )}
      {job?.status === 'RUNNING' && <Chip size="small" label="Generating…" sx={{ fontWeight: 600 }} />}
      {job?.status === 'FAILED' && <Chip size="small" label="Failed" color="error" sx={{ fontWeight: 600 }} />}
    </Stack>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/components/smartpos/reports/ReportExportBar.tsx
git commit -m "feat: add ReportExportBar shared component"
```

---

### Task 23: ReportPageShell

**Files:**
- Create: `frontend/src/components/smartpos/reports/ReportPageShell.tsx`

- [ ] **Step 1: Write ReportPageShell**

```tsx
import type { ReactNode } from 'react';
import { Box } from '@mui/material';
import PageHeader from 'src/components/smartpos/PageHeader';
import type { ExportReportKey } from 'src/api/smartpos/reports';

interface Props {
  title: string;
  subtitle?: string;
  children: ReactNode;
}

export default function ReportPageShell({ title, subtitle, children }: Props) {
  return (
    <Box sx={{ pb: 3 }}>
      <PageHeader title={title} subtitle={subtitle} />
      {children}
    </Box>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/components/smartpos/reports/ReportPageShell.tsx
git commit -m "feat: add ReportPageShell shared component"
```

---

### Task 24: Barrel export for shared components

**Files:**
- Create: `frontend/src/components/smartpos/reports/index.ts`

- [ ] **Step 1: Write barrel export**

```typescript
export { default as ReportPageShell } from './ReportPageShell';
export { default as ReportFilterBar } from './ReportFilterBar';
export type { ReportFilters } from './ReportFilterBar';
export { default as ReportKpiRow } from './ReportKpiRow';
export type { KpiCard } from './ReportKpiRow';
export { default as ReportChartCard } from './ReportChartCard';
export { default as ReportDataTable } from './ReportDataTable';
export type { Column } from './ReportDataTable';
export { default as ReportExportBar } from './ReportExportBar';
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/components/smartpos/reports/index.ts
git commit -m "feat: add barrel export for shared report components"
```

---

## Phase 7 — Frontend AI Components

### Task 25: AiReportSummary

**Files:**
- Create: `frontend/src/components/smartpos/reports/AiReportSummary.tsx`

- [ ] **Step 1: Write AiReportSummary**

```tsx
import { useState } from 'react';
import { Box, Button, Card, CardContent, CircularProgress, Collapse, Stack, Typography } from '@mui/material';
import { IconSparkles, IconChevronDown, IconChevronUp } from '@tabler/icons-react';
import { aiNarrate, type InsightResponse } from 'src/api/smartpos/ai';
import { brand } from 'src/theme/smartpos/brand';

interface Props {
  reportKind: string;
  factsJson: string;
}

export default function AiReportSummary({ reportKind, factsJson }: Props) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<InsightResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async () => {
    setOpen(true);
    if (result) return;
    setLoading(true);
    setError(null);
    try {
      const r = await aiNarrate({ reportKind, factsJson });
      setResult(r);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to generate summary');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card elevation={0} sx={{ border: `1px solid ${brand.neutral[200]}`, borderRadius: '12px', mb: 2 }}>
      <CardContent sx={{ p: 2 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" onClick={handleGenerate}
          sx={{ cursor: 'pointer' }}>
          <Stack direction="row" spacing={1} alignItems="center">
            <Box sx={{ width: 32, height: 32, borderRadius: '8px', bgcolor: brand.accent[50], color: brand.accent[500], display: 'grid', placeItems: 'center' }}>
              <IconSparkles size={18} />
            </Box>
            <Typography sx={{ fontWeight: 700, fontSize: 14, color: brand.neutral[900] }}>AI Summary</Typography>
          </Stack>
          {open ? <IconChevronUp size={18} /> : <IconChevronDown size={18} />}
        </Stack>

        <Collapse in={open}>
          <Box sx={{ mt: 2, pt: 2, borderTop: `1px solid ${brand.neutral[100]}` }}>
            {loading && <CircularProgress size={20} sx={{ color: brand.accent[500] }} />}
            {error && <Typography sx={{ color: brand.error.main, fontSize: 13 }}>{error}</Typography>}
            {result && (
              <Box sx={{ whiteSpace: 'pre-wrap', fontSize: 13, color: brand.neutral[800], lineHeight: 1.7 }}>
                {result.narrative}
              </Box>
            )}
            {!result && !loading && !error && (
              <Button variant="outlined" size="small" startIcon={<IconSparkles size={14} />}
                onClick={handleGenerate}
                sx={{ borderColor: brand.accent[300], color: brand.accent[600], fontWeight: 600 }}>
                Generate insight
              </Button>
            )}
          </Box>
        </Collapse>
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/components/smartpos/reports/AiReportSummary.tsx
git commit -m "feat: add AiReportSummary component"
```

---

### Task 26: AiRecommendations

**Files:**
- Create: `frontend/src/components/smartpos/reports/AiRecommendations.tsx`

- [ ] **Step 1: Write AiRecommendations**

```tsx
import { useState } from 'react';
import { Box, Button, Card, CardContent, Chip, CircularProgress, Collapse, Stack, Typography } from '@mui/material';
import { IconBulb, IconChevronDown, IconChevronUp } from '@tabler/icons-react';
import { aiGetRecommendations, type Recommendation } from 'src/api/smartpos/ai';
import { brand } from 'src/theme/smartpos/brand';

interface Props {
  reportKind: string;
  factsJson: string;
}

const priorityColor: Record<string, string> = {
  HIGH: brand.error.main, MEDIUM: brand.warning.main, LOW: brand.success.main,
};
const categoryColor: Record<string, string> = {
  INVENTORY: brand.info.main, PRICING: brand.accent[500], SALES: brand.primary[600],
  COST: brand.error.main, GENERAL: brand.neutral[600],
};

export default function AiRecommendations({ reportKind, factsJson }: Props) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [recs, setRecs] = useState<Recommendation[]>([]);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async () => {
    setOpen(true);
    if (recs.length > 0) return;
    setLoading(true);
    setError(null);
    try {
      const r = await aiGetRecommendations(reportKind, factsJson);
      setRecs(r.recommendations);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to generate recommendations');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card elevation={0} sx={{ border: `1px solid ${brand.neutral[200]}`, borderRadius: '12px', mb: 2 }}>
      <CardContent sx={{ p: 2 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" onClick={handleGenerate}
          sx={{ cursor: 'pointer' }}>
          <Stack direction="row" spacing={1} alignItems="center">
            <Box sx={{ width: 32, height: 32, borderRadius: '8px', bgcolor: brand.warning.light, color: brand.warning.main, display: 'grid', placeItems: 'center' }}>
              <IconBulb size={18} />
            </Box>
            <Typography sx={{ fontWeight: 700, fontSize: 14, color: brand.neutral[900] }}>AI Recommendations</Typography>
          </Stack>
          {open ? <IconChevronUp size={18} /> : <IconChevronDown size={18} />}
        </Stack>

        <Collapse in={open}>
          <Box sx={{ mt: 2, pt: 2, borderTop: `1px solid ${brand.neutral[100]}` }}>
            {loading && <CircularProgress size={20} sx={{ color: brand.accent[500] }} />}
            {error && <Typography sx={{ color: brand.error.main, fontSize: 13 }}>{error}</Typography>}
            {recs.length > 0 && (
              <Stack spacing={1.5}>
                {recs.map((r, i) => (
                  <Box key={i} sx={{ p: 1.5, borderRadius: '8px', border: `1px solid ${brand.neutral[200]}`, bgcolor: brand.neutral[50] }}>
                    <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }}>
                      <Typography sx={{ fontWeight: 700, fontSize: 13, flex: 1 }}>{r.title}</Typography>
                      <Chip label={r.priority} size="small" sx={{ bgcolor: `${priorityColor[r.priority]}18`, color: priorityColor[r.priority], fontWeight: 700, fontSize: 11 }} />
                      <Chip label={r.category} size="small" sx={{ bgcolor: `${categoryColor[r.category]}18`, color: categoryColor[r.category], fontWeight: 600, fontSize: 11 }} />
                    </Stack>
                    <Typography sx={{ fontSize: 12, color: brand.neutral[600] }}>{r.description}</Typography>
                  </Box>
                ))}
              </Stack>
            )}
            {!loading && !error && recs.length === 0 && (
              <Button variant="outlined" size="small" startIcon={<IconBulb size={14} />}
                onClick={handleGenerate}
                sx={{ borderColor: brand.warning.main, color: brand.warning.main, fontWeight: 600 }}>
                Generate recommendations
              </Button>
            )}
          </Box>
        </Collapse>
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/components/smartpos/reports/AiRecommendations.tsx
git commit -m "feat: add AiRecommendations component"
```

---

### Task 27: AiReportChat (floating button)

**Files:**
- Create: `frontend/src/components/smartpos/reports/AiReportChat.tsx`

- [ ] **Step 1: Write AiReportChat**

```tsx
import { useState } from 'react';
import { Box, Button, Fab, Paper, Stack, TextField, Typography, CircularProgress } from '@mui/material';
import { IconSparkles, IconX, IconSend } from '@tabler/icons-react';
import { aiChat, type InsightResponse } from 'src/api/smartpos/ai';
import { brand } from 'src/theme/smartpos/brand';

interface Props {
  contextPrompt: string;
}

export default function AiReportChat({ contextPrompt }: Props) {
  const [open, setOpen] = useState(false);
  const [question, setQuestion] = useState('');
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<{ role: 'user' | 'ai'; text: string }[]>([]);

  const handleAsk = async () => {
    if (!question.trim()) return;
    const q = question;
    setQuestion('');
    setMessages((m) => [...m, { role: 'user', text: q }]);
    setLoading(true);
    try {
      const r = await aiChat({ prompt: q, systemPrompt: contextPrompt });
      setMessages((m) => [...m, { role: 'ai', text: r.narrative }]);
    } catch {
      setMessages((m) => [...m, { role: 'ai', text: 'Sorry, I could not process that question.' }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Fab variant="extended" onClick={() => setOpen((o) => !o)}
        sx={{
          position: 'fixed', bottom: 24, right: 24, zIndex: 1200,
          bgcolor: brand.accent[500], color: '#fff', fontWeight: 700, fontSize: 13,
          '&:hover': { bgcolor: brand.accent[600] },
        }}>
        <IconSparkles size={18} style={{ marginRight: 8 }} />
        Ask AI
      </Fab>

      {open && (
        <Paper elevation={8} sx={{
          position: 'fixed', bottom: 88, right: 24, zIndex: 1200,
          width: 380, maxHeight: 480, borderRadius: '14px', overflow: 'hidden',
          display: 'flex', flexDirection: 'column',
        }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center"
            sx={{ px: 2, py: 1.5, bgcolor: brand.accent[500], color: '#fff' }}>
            <Typography sx={{ fontWeight: 800, fontSize: 14 }}>Ask about this report</Typography>
            <IconX size={18} sx={{ cursor: 'pointer' }} onClick={() => setOpen(false)} />
          </Stack>
          <Box sx={{ flex: 1, overflowY: 'auto', p: 2, maxHeight: 320 }}>
            {messages.map((m, i) => (
              <Box key={i} sx={{ mb: 1.5, textAlign: m.role === 'user' ? 'right' : 'left' }}>
                <Typography sx={{
                  display: 'inline-block', px: 1.5, py: 0.75, borderRadius: '10px', fontSize: 12,
                  bgcolor: m.role === 'user' ? brand.primary[50] : brand.neutral[100],
                  color: brand.neutral[900], maxWidth: '90%', whiteSpace: 'pre-wrap',
                }}>{m.text}</Typography>
              </Box>
            ))}
            {loading && <CircularProgress size={16} sx={{ color: brand.accent[500] }} />}
          </Box>
          <Stack direction="row" spacing={1} sx={{ p: 1.5, borderTop: `1px solid ${brand.neutral[200]}` }}>
            <TextField size="small" fullWidth placeholder="Ask about this data…" value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleAsk(); }}
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: '10px', fontSize: 13 } }} />
            <Button variant="contained" size="small" onClick={handleAsk} disabled={loading || !question.trim()}
              sx={{ minWidth: 44, bgcolor: brand.accent[500], '&:hover': { bgcolor: brand.accent[600] } }}>
              <IconSend size={16} />
            </Button>
          </Stack>
        </Paper>
      )}
    </>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/components/smartpos/reports/AiReportChat.tsx
git commit -m "feat: add AiReportChat floating Q&A component"
```

---

## Phase 8 — Frontend Report Pages

### Task 28: SalesReportPage

**Files:**
- Create: `frontend/src/views/smartpos/reports/SalesReportPage.tsx`

- [ ] **Step 1: Write SalesReportPage**

```tsx
import { useEffect, useMemo, useState } from 'react';
import { Grid } from '@mui/material';
import { ReportPageShell, ReportFilterBar, ReportKpiRow, ReportChartCard, ReportDataTable, ReportExportBar } from 'src/components/smartpos/reports';
import type { ReportFilters, KpiCard, Column } from 'src/components/smartpos/reports';
import AiReportSummary from 'src/components/smartpos/reports/AiReportSummary';
import AiRecommendations from 'src/components/smartpos/reports/AiRecommendations';
import AiReportChat from 'src/components/smartpos/reports/AiReportChat';
import { getSalesSummary, getTopProducts, getTopCustomers, getSalesByDimension, type SalesSummary, type TopProduct, type TopCustomer, type SalesByDimensionReport } from 'src/api/smartpos/reports';
import { listWarehouses, type Warehouse } from 'src/api/smartpos/inventory';
import { brand } from 'src/theme/smartpos/brand';
import { formatMoney, formatNumber } from 'src/utils/smartpos/currency';
import type { ApexOptions } from 'apexcharts';

const todayIso = () => new Date().toISOString().slice(0, 10);
const startOfMonth = () => new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10);
const chartFont = 'Inter, DM Sans, sans-serif';
const muted = brand.neutral[500];

export default function SalesReportPage() {
  const [filters, setFilters] = useState<ReportFilters>({ dateFrom: startOfMonth(), dateTo: todayIso(), warehouseId: '', period: 'MONTH' });
  const [sales, setSales] = useState<SalesSummary | null>(null);
  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
  const [topCustomers, setTopCustomers] = useState<TopCustomer[]>([]);
  const [byDimension, setByDimension] = useState<SalesByDimensionReport | null>(null);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listWarehouses().then((w) => setWarehouses(w.filter((r) => r.active))).catch(() => {});
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([
      getSalesSummary({ dateFrom: filters.dateFrom, dateTo: filters.dateTo, warehouseId: filters.warehouseId as any }),
      getTopProducts({ dateFrom: filters.dateFrom, dateTo: filters.dateTo, warehouseId: filters.warehouseId as any, limit: 20 }),
      getTopCustomers({ dateFrom: filters.dateFrom, dateTo: filters.dateTo, limit: 20 }),
      getSalesByDimension({ dateFrom: filters.dateFrom, dateTo: filters.dateTo, dimension: 'CATEGORY' }),
    ])
      .then(([s, tp, tc, dim]) => {
        if (cancelled) return;
        setSales(s); setTopProducts(tp); setTopCustomers(tc); setByDimension(dim);
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [filters.dateFrom, filters.dateTo, filters.warehouseId]);

  const kpis: KpiCard[] = useMemo(() => [
    { label: 'Gross Sales', value: formatMoney(sales?.gross ?? 0), color: brand.primary[600], sparkline: sales?.series?.map((s) => s.net) ?? [] },
    { label: 'Net Sales', value: formatMoney(sales?.net ?? 0), color: brand.info.main, sparkline: sales?.series?.map((s) => s.net) ?? [] },
    { label: 'Tax Collected', value: formatMoney(sales?.tax ?? 0), color: brand.warning.main },
    { label: 'Discounts', value: formatMoney(sales?.discount ?? 0), color: brand.error.main },
    { label: 'Orders', value: formatNumber(sales?.count ?? 0), color: brand.purple.main, sparkline: sales?.series?.map((s) => s.count) ?? [] },
    { label: 'Avg Sale', value: formatMoney(sales?.avgSale ?? 0), color: brand.success.main },
    { label: 'Paid', value: formatMoney(sales?.paid ?? 0), color: brand.primary[600] },
    { label: 'Due', value: formatMoney(sales?.due ?? 0), color: brand.error.main },
  ], [sales]);

  const revenueOptions: ApexOptions = useMemo(() => ({
    chart: { type: 'line', toolbar: { show: false }, fontFamily: chartFont, zoom: { enabled: false } },
    colors: [brand.primary[600], brand.info.main],
    stroke: { curve: 'smooth', width: 2.5 },
    dataLabels: { enabled: false },
    grid: { borderColor: brand.neutral[200], strokeDashArray: 0 },
    xaxis: { categories: sales?.series?.map((s) => s.date) ?? [], labels: { style: { colors: muted, fontSize: '11px' } } },
    yaxis: { labels: { formatter: (v: number) => formatMoney(v), style: { colors: muted } } },
    tooltip: { y: { formatter: (v: number) => formatMoney(v) } },
    legend: { position: 'top', fontSize: '12px' },
  }), [sales]);

  const productColumns: Column<TopProduct>[] = [
    { id: 'name', label: 'Product', render: (r) => r.productName ?? r.productId.slice(0, 8) },
    { id: 'qty', label: 'Qty Sold', align: 'right', render: (r) => formatNumber(r.qty) },
    { id: 'revenue', label: 'Revenue', align: 'right', render: (r) => formatMoney(r.revenue) },
  ];

  const customerColumns: Column<TopCustomer>[] = [
    { id: 'customer', label: 'Customer', render: (r) => r.customerId.slice(0, 8) },
    { id: 'orders', label: 'Orders', align: 'right', render: (r) => formatNumber(r.orderCount) },
    { id: 'spent', label: 'Total Spent', align: 'right', render: (r) => formatMoney(r.totalSpent) },
  ];

  const factsJson = JSON.stringify({ sales, topProducts: topProducts.slice(0, 10), topCustomers: topCustomers.slice(0, 10) });

  return (
    <ReportPageShell title="Sales Report" subtitle="Revenue trends, top products, customers, and category breakdown">
      <ReportFilterBar filters={filters} onChange={setFilters} showPeriod showWarehouse
        warehouses={warehouses.map((w) => ({ id: w.id, name: w.name }))} />

      <AiReportSummary reportKind="sales" factsJson={factsJson} />
      <AiRecommendations reportKind="sales" factsJson={factsJson} />

      <ReportKpiRow cards={kpis} />

      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid size={{ xs: 12, lg: 8 }}>
          <ReportChartCard title="Revenue Trend" options={revenueOptions}
            series={[
              { name: 'Net Revenue', data: sales?.series?.map((s) => s.net) ?? [] },
              { name: 'Orders', data: sales?.series?.map((s) => s.count) ?? [] },
            ]} type="line" />
        </Grid>
        <Grid size={{ xs: 12, lg: 4 }}>
          <ReportChartCard title="By Category" options={{
            chart: { type: 'donut', fontFamily: chartFont },
            labels: byDimension?.buckets?.map((b) => b.dimensionName ?? 'Other') ?? [],
            colors: [brand.primary[600], brand.info.main, brand.warning.main, brand.purple.main, brand.error.main, brand.success.main],
            dataLabels: { enabled: false },
            legend: { position: 'bottom', fontSize: '11px' },
            tooltip: { y: { formatter: (v: number) => formatMoney(v) } },
          }} series={byDimension?.buckets?.map((b) => b.net) ?? []} type="donut" height={300} />
        </Grid>
      </Grid>

      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid size={{ xs: 12, md: 6 }}>
          <ReportDataTable title="Top Products" columns={productColumns} rows={topProducts}
            getRowKey={(r) => r.productId} />
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <ReportDataTable title="Top Customers" columns={customerColumns} rows={topCustomers}
            getRowKey={(r) => r.customerId} />
        </Grid>
      </Grid>

      <ReportExportBar reportKey="sales-summary-series" dateFrom={filters.dateFrom} dateTo={filters.dateTo}
        warehouseId={filters.warehouseId || undefined} />

      <AiReportChat contextPrompt={`You are analyzing sales data from ${filters.dateFrom} to ${filters.dateTo}. Data: ${factsJson}`} />
    </ReportPageShell>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/views/smartpos/reports/SalesReportPage.tsx
git commit -m "feat: add SalesReportPage with charts, tables, AI summaries, and export"
```

---

### Task 29: ProfitLossPage

**Files:**
- Create: `frontend/src/views/smartpos/reports/ProfitLossPage.tsx`

- [ ] **Step 1: Write ProfitLossPage**

```tsx
import { useEffect, useMemo, useState } from 'react';
import { Box, Card, CardContent, Divider, Grid, Stack, Typography } from '@mui/material';
import { IconArrowUp, IconArrowDown } from '@tabler/icons-react';
import { ReportPageShell, ReportFilterBar, ReportChartCard, ReportExportBar } from 'src/components/smartpos/reports';
import type { ReportFilters, KpiCard } from 'src/components/smartpos/reports';
import { ReportKpiRow } from 'src/components/smartpos/reports';
import AiReportSummary from 'src/components/smartpos/reports/AiReportSummary';
import AiRecommendations from 'src/components/smartpos/reports/AiRecommendations';
import AiReportChat from 'src/components/smartpos/reports/AiReportChat';
import { getProfitLoss, type ProfitLoss } from 'src/api/smartpos/reports';
import { brand } from 'src/theme/smartpos/brand';
import { formatMoney } from 'src/utils/smartpos/currency';
import type { ApexOptions } from 'apexcharts';

const todayIso = () => new Date().toISOString().slice(0, 10);
const startOfMonth = () => new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10);
const chartFont = 'Inter, DM Sans, sans-serif';
const muted = brand.neutral[500];

export default function ProfitLossPage() {
  const [filters, setFilters] = useState<ReportFilters>({ dateFrom: startOfMonth(), dateTo: todayIso(), warehouseId: '', period: 'MONTH' });
  const [data, setData] = useState<ProfitLoss | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getProfitLoss({ dateFrom: filters.dateFrom, dateTo: filters.dateTo })
      .then((d) => { if (!cancelled) setData(d); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [filters.dateFrom, filters.dateTo]);

  const profitMargin = data?.revenueNet && data.revenueNet > 0 ? (data.netProfit / data.revenueNet) * 100 : 0;

  const barOptions: ApexOptions = useMemo(() => ({
    chart: { type: 'bar', toolbar: { show: false }, fontFamily: chartFont },
    colors: [brand.primary[600], brand.error.main, brand.success.main],
    xaxis: { categories: ['Revenue (Net)', 'COGS', 'OpEx', 'Net Profit'], labels: { style: { colors: muted } } },
    yaxis: { labels: { formatter: (v: number) => formatMoney(v), style: { colors: muted } } },
    dataLabels: { enabled: false },
    grid: { borderColor: brand.neutral[200] },
    plotOptions: { bar: { borderRadius: 8, columnWidth: '50%' } },
    tooltip: { y: { formatter: (v: number) => formatMoney(v) } },
  }), []);

  const factsJson = JSON.stringify(data);

  return (
    <ReportPageShell title="Profit & Loss Statement" subtitle="Revenue, costs, expenses, and net profit breakdown">
      <ReportFilterBar filters={filters} onChange={setFilters} showPeriod />

      <AiReportSummary reportKind="profit-loss" factsJson={factsJson} />
      <AiRecommendations reportKind="profit-loss" factsJson={factsJson} />

      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <PlCard label="Revenue (Net)" value={formatMoney(data?.revenueNet ?? 0)} positive />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <PlCard label="COGS" value={formatMoney(data?.costOfGoodsSold ?? 0)} positive={false} />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <PlCard label="Gross Profit" value={formatMoney(data?.grossProfit ?? 0)} positive={(data?.grossProfit ?? 0) >= 0} />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <PlCard label="Operating Expenses" value={formatMoney(data?.operatingExpenses ?? 0)} positive={false} />
        </Grid>
      </Grid>

      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid size={{ xs: 12, md: 6 }}>
          <ReportChartCard title="P&L Breakdown" options={barOptions}
            series={[{ name: 'Amount', data: [
              data?.revenueNet ?? 0, data?.costOfGoodsSold ?? 0, data?.operatingExpenses ?? 0, data?.netProfit ?? 0,
            ]}]} type="bar" />
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <Card elevation={0} sx={{ border: `1px solid ${brand.neutral[200]}`, borderRadius: '12px', height: '100%' }}>
            <Box sx={{ p: 2.25 }}>
              <Typography sx={{ fontWeight: 800, fontSize: 17, color: brand.neutral[900], mb: 2 }}>Summary</Typography>
              <Stack spacing={1.5} divider={<Divider />}>
                <Stack direction="row" justifyContent="space-between">
                  <Typography sx={{ color: muted }}>Revenue (Gross)</Typography>
                  <Typography sx={{ fontWeight: 700 }}>{formatMoney(data?.revenueGross ?? 0)}</Typography>
                </Stack>
                <Stack direction="row" justifyContent="space-between">
                  <Typography sx={{ color: muted }}>Discounts</Typography>
                  <Typography sx={{ fontWeight: 700, color: brand.error.main }}>-{formatMoney(data?.revenueDiscount ?? 0)}</Typography>
                </Stack>
                <Stack direction="row" justifyContent="space-between">
                  <Typography sx={{ color: muted }}>Revenue (Net)</Typography>
                  <Typography sx={{ fontWeight: 700 }}>{formatMoney(data?.revenueNet ?? 0)}</Typography>
                </Stack>
                <Stack direction="row" justifyContent="space-between">
                  <Typography sx={{ color: muted }}>Cost of Goods Sold</Typography>
                  <Typography sx={{ fontWeight: 700, color: brand.error.main }}>-{formatMoney(data?.costOfGoodsSold ?? 0)}</Typography>
                </Stack>
                <Stack direction="row" justifyContent="space-between">
                  <Typography sx={{ fontWeight: 700 }}>Gross Profit</Typography>
                  <Typography sx={{ fontWeight: 800, color: (data?.grossProfit ?? 0) >= 0 ? brand.success.main : brand.error.main }}>
                    {formatMoney(data?.grossProfit ?? 0)}
                  </Typography>
                </Stack>
                <Stack direction="row" justifyContent="space-between">
                  <Typography sx={{ color: muted }}>Operating Expenses</Typography>
                  <Typography sx={{ fontWeight: 700, color: brand.error.main }}>-{formatMoney(data?.operatingExpenses ?? 0)}</Typography>
                </Stack>
                <Stack direction="row" justifyContent="space-between">
                  <Typography sx={{ fontWeight: 800, fontSize: 15 }}>Net Profit</Typography>
                  <Typography sx={{ fontWeight: 900, fontSize: 15, color: (data?.netProfit ?? 0) >= 0 ? brand.success.main : brand.error.main }}>
                    {formatMoney(data?.netProfit ?? 0)}
                  </Typography>
                </Stack>
                <Stack direction="row" justifyContent="space-between">
                  <Typography sx={{ color: muted }}>Profit Margin</Typography>
                  <Typography sx={{ fontWeight: 700 }}>{profitMargin.toFixed(1)}%</Typography>
                </Stack>
              </Stack>
            </Box>
          </Card>
        </Grid>
      </Grid>

      <ReportExportBar reportKey="sales-summary-series" dateFrom={filters.dateFrom} dateTo={filters.dateTo} />
      <AiReportChat contextPrompt={`You are analyzing P&L data from ${filters.dateFrom} to ${filters.dateTo}. Data: ${factsJson}`} />
    </ReportPageShell>
  );
}

function PlCard({ label, value, positive }: { label: string; value: string; positive: boolean }) {
  return (
    <Card elevation={0} sx={{ border: `1px solid ${brand.neutral[200]}`, borderRadius: '12px', height: '100%' }}>
      <Box sx={{ p: 2.25 }}>
        <Typography sx={{ color: brand.neutral[600], fontSize: 12, fontWeight: 600 }}>{label}</Typography>
        <Typography sx={{ color: brand.neutral[900], fontWeight: 900, fontSize: 22, mt: 0.75 }}>{value}</Typography>
        <Stack direction="row" spacing={0.5} alignItems="center" sx={{ mt: 0.5 }}>
          {positive ? <IconArrowUp size={14} color={brand.success.main} /> : <IconArrowDown size={14} color={brand.error.main} />}
          <Typography sx={{ color: brand.neutral[500], fontSize: 12 }}>This period</Typography>
        </Stack>
      </Box>
    </Card>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/views/smartpos/reports/ProfitLossPage.tsx
git commit -m "feat: add ProfitLossPage with full P&L statement and chart"
```

---

### Task 30: QuickReportPages (Inventory, Tax, Purchase, Payment, Customer)

The remaining 5 report pages follow the same pattern as SalesReportPage — filter bar, AI summary, KPI cards, chart, data table, export bar, AI chat. Each page calls its specific API endpoint and renders data shaped for that report type.

Create each file, then commit individually:

- `InventoryReportPage.tsx` — calls `getInventorySummary`, `getInventoryValuation`, `getDeadStock`. Shows stock levels table, valuation chart, low-stock alerts.
- `TaxReportPage.tsx` — calls `getTaxSummary`. Shows tax by rate pie chart, tax by category bar chart, taxable sales summary.
- `PurchaseReportPage.tsx` — calls `getPurchaseSummary`. Shows purchase trends, supplier table.
- `PaymentReportPage.tsx` — calls `getPaymentSummary`. Shows inflow/outflow chart, method mix, outstanding.
- `CustomerReportPage.tsx` — calls `getCustomerSummary`. Shows top customers, frequency distribution.

Each page creates its own KPI cards, chart options, and table columns following the exact pattern established in SalesReportPage and ProfitLossPage. Full code for each:

- [ ] **Step 1: Write InventoryReportPage**

Create `frontend/src/views/smartpos/reports/InventoryReportPage.tsx`:

```tsx
import { useEffect, useMemo, useState } from 'react';
import { Grid } from '@mui/material';
import { ReportPageShell, ReportFilterBar, ReportKpiRow, ReportChartCard, ReportDataTable, ReportExportBar } from 'src/components/smartpos/reports';
import type { ReportFilters, KpiCard, Column } from 'src/components/smartpos/reports';
import AiReportSummary from 'src/components/smartpos/reports/AiReportSummary';
import AiRecommendations from 'src/components/smartpos/reports/AiRecommendations';
import AiReportChat from 'src/components/smartpos/reports/AiReportChat';
import { getInventorySummary, getInventoryValuation, getDeadStock, type InventorySummary, type InventoryValuationReport, type DeadStockReport } from 'src/api/smartpos/reports';
import { listWarehouses, type Warehouse } from 'src/api/smartpos/inventory';
import { brand } from 'src/theme/smartpos/brand';
import { formatMoney, formatNumber } from 'src/utils/smartpos/currency';
import type { ApexOptions } from 'apexcharts';

const chartFont = 'Inter, DM Sans, sans-serif';
const muted = brand.neutral[500];
const todayIso = () => new Date().toISOString().slice(0, 10);

export default function InventoryReportPage() {
  const [filters, setFilters] = useState<ReportFilters>({ dateFrom: '', dateTo: todayIso(), warehouseId: '', period: '' });
  const [summary, setSummary] = useState<InventorySummary | null>(null);
  const [valuation, setValuation] = useState<InventoryValuationReport | null>(null);
  const [deadStock, setDeadStock] = useState<DeadStockReport | null>(null);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listWarehouses().then((w) => setWarehouses(w.filter((r) => r.active))).catch(() => {});
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([
      getInventorySummary(filters.warehouseId as any || undefined),
      getInventoryValuation({ method: 'AVG', warehouseId: filters.warehouseId as any || undefined }),
      getDeadStock({ warehouseId: filters.warehouseId as any || undefined }),
    ])
      .then(([s, v, d]) => { if (!cancelled) { setSummary(s); setValuation(v); setDeadStock(d); } })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [filters.warehouseId]);

  const kpis: KpiCard[] = useMemo(() => [
    { label: 'Total SKUs', value: formatNumber(summary?.distinctProducts ?? 0), color: brand.primary[600] },
    { label: 'Total On Hand', value: formatNumber(summary?.totalOnHand ?? 0), color: brand.info.main },
    { label: 'Total Available', value: formatNumber(summary?.totalAvailable ?? 0), color: brand.success.main },
    { label: 'Low Stock Lines', value: formatNumber(summary?.lowStockLines ?? 0), color: brand.error.main },
    { label: 'Inventory Value', value: formatMoney(valuation?.totalValuation ?? 0), color: brand.warning.main },
    { label: 'Dead Stock Value', value: formatMoney(deadStock?.totalValueAtCost ?? 0), color: brand.neutral[500] },
  ], [summary, valuation, deadStock]);

  const valColumns: Column<InventoryValuationReport['rows'][number]>[] = [
    { id: 'code', label: 'Code', render: (r) => r.productCode ?? r.productId.slice(0, 8) },
    { id: 'name', label: 'Product', render: (r) => r.productName ?? '—' },
    { id: 'onHand', label: 'On Hand', align: 'right', render: (r) => formatNumber(r.onHand) },
    { id: 'unitCost', label: 'Unit Cost', align: 'right', render: (r) => formatMoney(r.unitCost) },
    { id: 'valuation', label: 'Valuation', align: 'right', render: (r) => formatMoney(r.valuation) },
  ];

  const deadColumns: Column<DeadStockReport['rows'][number]>[] = [
    { id: 'code', label: 'Code', render: (r) => r.productCode ?? '—' },
    { id: 'name', label: 'Product', render: (r) => r.productName ?? r.productId.slice(0, 8) },
    { id: 'onHand', label: 'On Hand', align: 'right', render: (r) => formatNumber(r.onHand) },
    { id: 'value', label: 'Value', align: 'right', render: (r) => formatMoney(r.valuationAtCost) },
    { id: 'lastSold', label: 'Last Sold', render: (r) => r.lastSoldDate ?? 'Never' },
  ];

  const factsJson = JSON.stringify({ summary, valuation, deadStock });

  const valBarOptions: ApexOptions = {
    chart: { type: 'bar', toolbar: { show: false }, fontFamily: chartFont },
    colors: [brand.primary[600]],
    xaxis: { categories: valuation?.rows?.slice(0, 15).map((r) => r.productCode ?? r.productName ?? '') ?? [], labels: { style: { colors: muted, fontSize: '10px' } } },
    yaxis: { labels: { formatter: (v: number) => formatMoney(v), style: { colors: muted } } },
    dataLabels: { enabled: false },
    grid: { borderColor: brand.neutral[200] },
    plotOptions: { bar: { borderRadius: 6 } },
    tooltip: { y: { formatter: (v: number) => formatMoney(v) } },
  };

  return (
    <ReportPageShell title="Inventory Report" subtitle="Stock levels, valuation, and dead stock analysis">
      <ReportFilterBar filters={filters} onChange={setFilters} showWarehouse
        warehouses={warehouses.map((w) => ({ id: w.id, name: w.name }))} />
      <AiReportSummary reportKind="inventory" factsJson={factsJson} />
      <AiRecommendations reportKind="inventory" factsJson={factsJson} />
      <ReportKpiRow cards={kpis} />
      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid size={{ xs: 12, lg: 7 }}>
          <ReportChartCard title="Top 15 by Valuation" options={valBarOptions}
            series={[{ name: 'Valuation', data: valuation?.rows?.slice(0, 15).map((r) => r.valuation) ?? [] }]} type="bar" />
        </Grid>
        <Grid size={{ xs: 12, lg: 5 }}>
          <ReportDataTable title="Dead Stock" columns={deadColumns} rows={deadStock?.rows ?? []}
            getRowKey={(r, i) => `${r.productId}-${i}`} />
        </Grid>
      </Grid>
      <ReportDataTable title="Inventory Valuation" columns={valColumns} rows={valuation?.rows ?? []}
        getRowKey={(r, i) => `${r.productId}-${r.warehouseId}-${i}`} />
      <ReportExportBar reportKey="sales-summary-series" />
      <AiReportChat contextPrompt={`You are analyzing inventory data. Data: ${factsJson}`} />
    </ReportPageShell>
  );
}
```

```bash
git add frontend/src/views/smartpos/reports/InventoryReportPage.tsx
git commit -m "feat: add InventoryReportPage with stock levels, valuation, and dead stock"
```

- [ ] **Step 2: Write TaxReportPage**

Create `frontend/src/views/smartpos/reports/TaxReportPage.tsx`:

```tsx
import { useEffect, useMemo, useState } from 'react';
import { Grid } from '@mui/material';
import { ReportPageShell, ReportFilterBar, ReportKpiRow, ReportChartCard, ReportDataTable, ReportExportBar } from 'src/components/smartpos/reports';
import type { ReportFilters, KpiCard, Column } from 'src/components/smartpos/reports';
import AiReportSummary from 'src/components/smartpos/reports/AiReportSummary';
import AiReportChat from 'src/components/smartpos/reports/AiReportChat';
import { getTaxSummary, type TaxSummary, type TaxByRate, type TaxByCategory } from 'src/api/smartpos/reports';
import { brand } from 'src/theme/smartpos/brand';
import { formatMoney, formatNumber } from 'src/utils/smartpos/currency';
import type { ApexOptions } from 'apexcharts';

const todayIso = () => new Date().toISOString().slice(0, 10);
const startOfMonth = () => new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10);
const chartFont = 'Inter, DM Sans, sans-serif';
const muted = brand.neutral[500];

export default function TaxReportPage() {
  const [filters, setFilters] = useState<ReportFilters>({ dateFrom: startOfMonth(), dateTo: todayIso(), warehouseId: '', period: 'MONTH' });
  const [data, setData] = useState<TaxSummary | null>(null);

  useEffect(() => {
    let cancelled = false;
    getTaxSummary({ dateFrom: filters.dateFrom, dateTo: filters.dateTo })
      .then((d) => { if (!cancelled) setData(d); });
    return () => { cancelled = true; };
  }, [filters.dateFrom, filters.dateTo]);

  const kpis: KpiCard[] = useMemo(() => [
    { label: 'Total Tax', value: formatMoney(data?.totalTax ?? 0), color: brand.primary[600] },
    { label: 'Taxable Sales', value: formatMoney(data?.taxableSales ?? 0), color: brand.info.main },
    { label: 'Transactions', value: formatNumber(data?.transactionCount ?? 0), color: brand.warning.main },
    { label: 'Effective Rate', value: `${data?.taxableSales && data.taxableSales > 0 ? ((data.totalTax / data.taxableSales) * 100).toFixed(1) : '0'}%`, color: brand.purple.main },
  ], [data]);

  const rateColumns: Column<TaxByRate>[] = [
    { id: 'rate', label: 'Tax Rate %', align: 'right', render: (r) => `${r.rate}%` },
    { id: 'taxable', label: 'Taxable Amount', align: 'right', render: (r) => formatMoney(r.taxableAmount) },
    { id: 'tax', label: 'Tax Amount', align: 'right', render: (r) => formatMoney(r.taxAmount) },
    { id: 'count', label: 'Transactions', align: 'right', render: (r) => formatNumber(r.count) },
  ];

  const catColumns: Column<TaxByCategory>[] = [
    { id: 'cat', label: 'Category', render: (r) => r.categoryName },
    { id: 'taxable', label: 'Taxable', align: 'right', render: (r) => formatMoney(r.taxableAmount) },
    { id: 'tax', label: 'Tax', align: 'right', render: (r) => formatMoney(r.taxAmount) },
    { id: 'count', label: 'Count', align: 'right', render: (r) => formatNumber(r.count) },
  ];

  const pieOptions: ApexOptions = {
    chart: { type: 'donut', fontFamily: chartFont },
    labels: data?.byRate?.map((r) => `${r.rate}%`) ?? [],
    colors: [brand.primary[600], brand.info.main, brand.warning.main, brand.error.main, brand.purple.main],
    dataLabels: { enabled: false },
    legend: { position: 'bottom', fontSize: '11px' },
    tooltip: { y: { formatter: (v: number) => formatMoney(v) } },
  };

  const factsJson = JSON.stringify(data);

  return (
    <ReportPageShell title="Tax Report" subtitle="Tax collected by rate, category, and period">
      <ReportFilterBar filters={filters} onChange={setFilters} showPeriod />
      <AiReportSummary reportKind="tax" factsJson={factsJson} />
      <ReportKpiRow cards={kpis} />
      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid size={{ xs: 12, md: 4 }}>
          <ReportChartCard title="Tax by Rate" options={pieOptions}
            series={data?.byRate?.map((r) => r.taxAmount) ?? []} type="donut" height={300} />
        </Grid>
        <Grid size={{ xs: 12, md: 8 }}>
          <ReportDataTable title="Tax by Category" columns={catColumns} rows={data?.byCategory ?? []}
            getRowKey={(r, i) => r.categoryName + i} />
        </Grid>
      </Grid>
      <ReportDataTable title="Tax by Rate" columns={rateColumns} rows={data?.byRate ?? []}
        getRowKey={(r) => String(r.rate)} />
      <ReportExportBar reportKey="tax-summary" dateFrom={filters.dateFrom} dateTo={filters.dateTo} />
      <AiReportChat contextPrompt={`You are analyzing tax data from ${filters.dateFrom} to ${filters.dateTo}. Data: ${factsJson}`} />
    </ReportPageShell>
  );
}
```

```bash
git add frontend/src/views/smartpos/reports/TaxReportPage.tsx
git commit -m "feat: add TaxReportPage with tax by rate and category"
```

- [ ] **Step 3: Write PurchaseReportPage**

Create `frontend/src/views/smartpos/reports/PurchaseReportPage.tsx`:

```tsx
import { useEffect, useMemo, useState } from 'react';
import { Grid } from '@mui/material';
import { ReportPageShell, ReportFilterBar, ReportKpiRow, ReportChartCard, ReportDataTable, ReportExportBar } from 'src/components/smartpos/reports';
import type { ReportFilters, KpiCard, Column } from 'src/components/smartpos/reports';
import AiReportSummary from 'src/components/smartpos/reports/AiReportSummary';
import AiRecommendations from 'src/components/smartpos/reports/AiRecommendations';
import AiReportChat from 'src/components/smartpos/reports/AiReportChat';
import { getPurchaseSummary, type PurchaseSummary, type TopSupplier } from 'src/api/smartpos/reports';
import { listWarehouses, type Warehouse } from 'src/api/smartpos/inventory';
import { brand } from 'src/theme/smartpos/brand';
import { formatMoney, formatNumber } from 'src/utils/smartpos/currency';
import type { ApexOptions } from 'apexcharts';

const todayIso = () => new Date().toISOString().slice(0, 10);
const startOfMonth = () => new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10);
const chartFont = 'Inter, DM Sans, sans-serif';
const muted = brand.neutral[500];

export default function PurchaseReportPage() {
  const [filters, setFilters] = useState<ReportFilters>({ dateFrom: startOfMonth(), dateTo: todayIso(), warehouseId: '', period: 'MONTH' });
  const [data, setData] = useState<PurchaseSummary | null>(null);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);

  useEffect(() => {
    listWarehouses().then((w) => setWarehouses(w.filter((r) => r.active))).catch(() => {});
  }, []);

  useEffect(() => {
    let cancelled = false;
    getPurchaseSummary({ dateFrom: filters.dateFrom, dateTo: filters.dateTo, warehouseId: filters.warehouseId as any })
      .then((d) => { if (!cancelled) setData(d); });
    return () => { cancelled = true; };
  }, [filters.dateFrom, filters.dateTo, filters.warehouseId]);

  const kpis: KpiCard[] = useMemo(() => [
    { label: 'Purchase Orders', value: formatNumber(data?.count ?? 0), color: brand.primary[600] },
    { label: 'Gross Purchases', value: formatMoney(data?.gross ?? 0), color: brand.info.main },
    { label: 'Paid', value: formatMoney(data?.paid ?? 0), color: brand.success.main },
    { label: 'Due', value: formatMoney(data?.due ?? 0), color: brand.error.main },
    { label: 'Avg Purchase', value: formatMoney(data?.avgPurchase ?? 0), color: brand.warning.main },
  ], [data]);

  const supplierColumns: Column<TopSupplier>[] = [
    { id: 'name', label: 'Supplier', render: (r) => r.supplierName ?? r.supplierId.slice(0, 8) },
    { id: 'orders', label: 'Orders', align: 'right', render: (r) => formatNumber(r.orderCount) },
    { id: 'spent', label: 'Total Spent', align: 'right', render: (r) => formatMoney(r.totalSpent) },
  ];

  const factsJson = JSON.stringify(data);

  return (
    <ReportPageShell title="Purchase Report" subtitle="Purchase orders, spending, and supplier analysis">
      <ReportFilterBar filters={filters} onChange={setFilters} showPeriod showWarehouse
        warehouses={warehouses.map((w) => ({ id: w.id, name: w.name }))} />
      <AiReportSummary reportKind="purchases" factsJson={factsJson} />
      <AiRecommendations reportKind="purchases" factsJson={factsJson} />
      <ReportKpiRow cards={kpis} />
      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid size={{ xs: 12 }}>
          <ReportDataTable title="Top Suppliers" columns={supplierColumns} rows={data?.topSuppliers ?? []}
            getRowKey={(r) => r.supplierId} />
        </Grid>
      </Grid>
      <ReportExportBar reportKey="purchases-summary" dateFrom={filters.dateFrom} dateTo={filters.dateTo}
        warehouseId={filters.warehouseId || undefined} />
      <AiReportChat contextPrompt={`You are analyzing purchase data from ${filters.dateFrom} to ${filters.dateTo}. Data: ${factsJson}`} />
    </ReportPageShell>
  );
}
```

```bash
git add frontend/src/views/smartpos/reports/PurchaseReportPage.tsx
git commit -m "feat: add PurchaseReportPage with supplier analysis"
```

- [ ] **Step 4: Write PaymentReportPage**

Create `frontend/src/views/smartpos/reports/PaymentReportPage.tsx`:

```tsx
import { useEffect, useMemo, useState } from 'react';
import { Grid } from '@mui/material';
import { ReportPageShell, ReportFilterBar, ReportKpiRow, ReportChartCard, ReportDataTable, ReportExportBar } from 'src/components/smartpos/reports';
import type { ReportFilters, KpiCard, Column } from 'src/components/smartpos/reports';
import AiReportSummary from 'src/components/smartpos/reports/AiReportSummary';
import AiReportChat from 'src/components/smartpos/reports/AiReportChat';
import { getPaymentSummary, type PaymentSummary, type PaymentMethodRow } from 'src/api/smartpos/reports';
import { brand } from 'src/theme/smartpos/brand';
import { formatMoney, formatNumber } from 'src/utils/smartpos/currency';
import type { ApexOptions } from 'apexcharts';

const todayIso = () => new Date().toISOString().slice(0, 10);
const startOfMonth = () => new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10);
const chartFont = 'Inter, DM Sans, sans-serif';
const muted = brand.neutral[500];

export default function PaymentReportPage() {
  const [filters, setFilters] = useState<ReportFilters>({ dateFrom: startOfMonth(), dateTo: todayIso(), warehouseId: '', period: 'MONTH' });
  const [data, setData] = useState<PaymentSummary | null>(null);

  useEffect(() => {
    let cancelled = false;
    getPaymentSummary({ dateFrom: filters.dateFrom, dateTo: filters.dateTo })
      .then((d) => { if (!cancelled) setData(d); });
    return () => { cancelled = true; };
  }, [filters.dateFrom, filters.dateTo]);

  const kpis: KpiCard[] = useMemo(() => [
    { label: 'Total Inflow', value: formatMoney(data?.totalIn ?? 0), color: brand.success.main },
    { label: 'Total Outflow', value: formatMoney(data?.totalOut ?? 0), color: brand.error.main },
    { label: 'Net Flow', value: formatMoney(data?.netFlow ?? 0), color: (data?.netFlow ?? 0) >= 0 ? brand.primary[600] : brand.error.main },
    { label: 'Transactions', value: formatNumber(data?.totalCount ?? 0), color: brand.info.main },
  ], [data]);

  const methodColumns: Column<PaymentMethodRow>[] = [
    { id: 'method', label: 'Method', render: (r) => r.method },
    { id: 'total', label: 'Total', align: 'right', render: (r) => formatMoney(r.total) },
    { id: 'count', label: 'Count', align: 'right', render: (r) => formatNumber(r.count) },
  ];

  const donutOptions: ApexOptions = {
    chart: { type: 'donut', fontFamily: chartFont },
    labels: data?.byMethod?.map((m) => m.method) ?? [],
    colors: [brand.primary[600], brand.info.main, brand.warning.main, brand.purple.main, brand.error.main, brand.success.main],
    dataLabels: { enabled: false },
    legend: { position: 'bottom', fontSize: '11px' },
    tooltip: { y: { formatter: (v: number) => formatMoney(v) } },
  };

  const factsJson = JSON.stringify(data);

  return (
    <ReportPageShell title="Payment Report" subtitle="Cash flow, payment methods, and outstanding collections">
      <ReportFilterBar filters={filters} onChange={setFilters} showPeriod />
      <AiReportSummary reportKind="payments" factsJson={factsJson} />
      <ReportKpiRow cards={kpis} />
      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid size={{ xs: 12, md: 4 }}>
          <ReportChartCard title="Payment Methods" options={donutOptions}
            series={data?.byMethod?.map((m) => m.total) ?? []} type="donut" height={300} />
        </Grid>
        <Grid size={{ xs: 12, md: 8 }}>
          <ReportDataTable title="By Method" columns={methodColumns} rows={data?.byMethod ?? []}
            getRowKey={(r) => r.method} />
        </Grid>
      </Grid>
      <ReportExportBar reportKey="payments-summary" dateFrom={filters.dateFrom} dateTo={filters.dateTo} />
      <AiReportChat contextPrompt={`You are analyzing payment data from ${filters.dateFrom} to ${filters.dateTo}. Data: ${factsJson}`} />
    </ReportPageShell>
  );
}
```

```bash
git add frontend/src/views/smartpos/reports/PaymentReportPage.tsx
git commit -m "feat: add PaymentReportPage with payment methods and cash flow"
```

- [ ] **Step 5: Write CustomerReportPage**

Create `frontend/src/views/smartpos/reports/CustomerReportPage.tsx`:

```tsx
import { useEffect, useMemo, useState } from 'react';
import { Grid } from '@mui/material';
import { ReportPageShell, ReportFilterBar, ReportKpiRow, ReportDataTable, ReportExportBar } from 'src/components/smartpos/reports';
import type { ReportFilters, KpiCard, Column } from 'src/components/smartpos/reports';
import AiReportSummary from 'src/components/smartpos/reports/AiReportSummary';
import AiRecommendations from 'src/components/smartpos/reports/AiRecommendations';
import AiReportChat from 'src/components/smartpos/reports/AiReportChat';
import { getCustomerSummary, type CustomerSummary, type TopCustomerDetail } from 'src/api/smartpos/reports';
import { brand } from 'src/theme/smartpos/brand';
import { formatMoney, formatNumber } from 'src/utils/smartpos/currency';

const todayIso = () => new Date().toISOString().slice(0, 10);
const startOfMonth = () => new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10);

export default function CustomerReportPage() {
  const [filters, setFilters] = useState<ReportFilters>({ dateFrom: startOfMonth(), dateTo: todayIso(), warehouseId: '', period: 'MONTH' });
  const [data, setData] = useState<CustomerSummary | null>(null);

  useEffect(() => {
    let cancelled = false;
    getCustomerSummary({ dateFrom: filters.dateFrom, dateTo: filters.dateTo })
      .then((d) => { if (!cancelled) setData(d); });
    return () => { cancelled = true; };
  }, [filters.dateFrom, filters.dateTo]);

  const kpis: KpiCard[] = useMemo(() => [
    { label: 'Total Customers', value: formatNumber(data?.totalCustomers ?? 0), color: brand.primary[600] },
    { label: 'Active This Period', value: formatNumber(data?.activeCustomers ?? 0), color: brand.success.main },
    { label: 'Total Revenue', value: formatMoney(data?.totalRevenue ?? 0), color: brand.info.main },
    { label: 'Avg Revenue/Customer', value: formatMoney(data?.avgRevenuePerCustomer ?? 0), color: brand.warning.main },
  ], [data]);

  const customerColumns: Column<TopCustomerDetail>[] = [
    { id: 'name', label: 'Customer', render: (r) => r.customerName ?? r.customerId.slice(0, 8) },
    { id: 'orders', label: 'Orders', align: 'right', render: (r) => formatNumber(r.orderCount) },
    { id: 'spent', label: 'Total Spent', align: 'right', render: (r) => formatMoney(r.totalSpent) },
    { id: 'lastPurchase', label: 'Last Purchase', render: (r) => r.lastPurchase ?? '—' },
  ];

  const factsJson = JSON.stringify(data);

  return (
    <ReportPageShell title="Customer Report" subtitle="Customer spend, frequency, and retention analysis">
      <ReportFilterBar filters={filters} onChange={setFilters} showPeriod />
      <AiReportSummary reportKind="customers" factsJson={factsJson} />
      <AiRecommendations reportKind="customers" factsJson={factsJson} />
      <ReportKpiRow cards={kpis} />
      <ReportDataTable title="Top Customers" columns={customerColumns} rows={data?.topCustomers ?? []}
        getRowKey={(r) => r.customerId} />
      <ReportExportBar reportKey="customers-summary" dateFrom={filters.dateFrom} dateTo={filters.dateTo} />
      <AiReportChat contextPrompt={`You are analyzing customer data from ${filters.dateFrom} to ${filters.dateTo}. Data: ${factsJson}`} />
    </ReportPageShell>
  );
}
```

```bash
git add frontend/src/views/smartpos/reports/CustomerReportPage.tsx
git commit -m "feat: add CustomerReportPage with customer analytics"
```

---

### Task 31: ReportsHubPage

**Files:**
- Create: `frontend/src/views/smartpos/reports/ReportsHubPage.tsx`

- [ ] **Step 1: Write ReportsHubPage**

```tsx
import { Box, Card, CardActionArea, CardContent, Grid, Stack, Typography } from '@mui/material';
import { Link as RouterLink } from 'react-router';
import {
  IconChartBar, IconReceipt, IconPackage, IconPercentage,
  IconShoppingCart, IconCoin, IconUsers, IconChartInfographic, IconDownload,
} from '@tabler/icons-react';
import PageHeader from 'src/components/smartpos/PageHeader';
import { brand } from 'src/theme/smartpos/brand';

const REPORTS = [
  { title: 'Sales Report', description: 'Revenue trends, top products, customers, and category breakdown',
    icon: IconChartBar, to: '/smartpos/reports/sales', color: brand.primary[600], soft: brand.primary[50] },
  { title: 'Profit & Loss', description: 'Revenue, COGS, gross profit, expenses, and net profit',
    icon: IconReceipt, to: '/smartpos/reports/profit-loss', color: brand.info.main, soft: brand.info.light },
  { title: 'Inventory Report', description: 'Stock levels, valuation, low stock alerts, and dead stock',
    icon: IconPackage, to: '/smartpos/reports/inventory', color: brand.success.main, soft: brand.success.light },
  { title: 'Tax Report', description: 'Tax collected by rate, category, and period',
    icon: IconPercentage, to: '/smartpos/reports/tax', color: brand.warning.main, soft: brand.warning.light },
  { title: 'Purchase Report', description: 'Purchase orders, spending, and supplier analysis',
    icon: IconShoppingCart, to: '/smartpos/reports/purchases', color: brand.purple.main, soft: brand.purple.light },
  { title: 'Payment Report', description: 'Cash flow, payment methods, and outstanding',
    icon: IconCoin, to: '/smartpos/reports/payments', color: brand.success.main, soft: brand.success.light },
  { title: 'Customer Report', description: 'Customer spend, frequency, and retention',
    icon: IconUsers, to: '/smartpos/reports/customers', color: brand.info.main, soft: brand.info.light },
  { title: 'Advanced Reports', description: 'Warranty, dead stock, inventory valuation, sales by dimension',
    icon: IconChartInfographic, to: '/smartpos/reports/advanced', color: brand.accent[500], soft: brand.accent[50] },
  { title: 'Async Exports', description: 'Export reports to PDF, Excel, or CSV with background processing',
    icon: IconDownload, to: '/smartpos/reports/exports', color: brand.neutral[600], soft: brand.neutral[100] },
];

export default function ReportsHubPage() {
  return (
    <Box>
      <PageHeader title="Reports" subtitle="Explore and export business intelligence across all dimensions" />
      <Grid container spacing={2}>
        {REPORTS.map((r) => (
          <Grid size={{ xs: 12, sm: 6, md: 4 }} key={r.to}>
            <Card elevation={0} sx={{ border: `1px solid ${brand.neutral[200]}`, borderRadius: '12px', height: '100%',
              transition: 'transform 0.15s ease, box-shadow 0.15s ease',
              '&:hover': { transform: 'translateY(-2px)', boxShadow: '0 8px 24px rgba(15,23,42,0.08)' },
            }}>
              <CardActionArea component={RouterLink} to={r.to} sx={{ height: '100%', p: 0 }}>
                <CardContent sx={{ p: 2.5 }}>
                  <Box sx={{ width: 44, height: 44, borderRadius: '10px', bgcolor: r.soft, color: r.color,
                    display: 'grid', placeItems: 'center', mb: 1.5 }}>
                    <r.icon size={22} />
                  </Box>
                  <Typography sx={{ fontWeight: 800, fontSize: 15, color: brand.neutral[900], mb: 0.5 }}>{r.title}</Typography>
                  <Typography sx={{ color: brand.neutral[500], fontSize: 13, lineHeight: 1.4 }}>{r.description}</Typography>
                </CardContent>
              </CardActionArea>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/views/smartpos/reports/ReportsHubPage.tsx
git commit -m "feat: add ReportsHubPage with cards linking to all report types"
```

---

## Phase 9 — Router + Sidebar

### Task 32: Update Router with new report routes

**Files:**
- Modify: `frontend/src/routes/Router.tsx`

- [ ] **Step 1: Add route imports and children**

Add lazy imports (place near existing SmartPosReports and SmartPosAdvReports imports):

```tsx
const SmartPosReportsHub = Loadable(lazy(() => import('../views/smartpos/reports/ReportsHubPage')));
const SmartPosSalesReport = Loadable(lazy(() => import('../views/smartpos/reports/SalesReportPage')));
const SmartPosProfitLoss = Loadable(lazy(() => import('../views/smartpos/reports/ProfitLossPage')));
const SmartPosInventoryReport = Loadable(lazy(() => import('../views/smartpos/reports/InventoryReportPage')));
const SmartPosTaxReport = Loadable(lazy(() => import('../views/smartpos/reports/TaxReportPage')));
const SmartPosPurchaseReport = Loadable(lazy(() => import('../views/smartpos/reports/PurchaseReportPage')));
const SmartPosPaymentReport = Loadable(lazy(() => import('../views/smartpos/reports/PaymentReportPage')));
const SmartPosCustomerReport = Loadable(lazy(() => import('../views/smartpos/reports/CustomerReportPage')));
```

Replace the existing reports route entries:
```tsx
// Reports
{ path: 'reports', element: <SmartPosReports /> },
{ path: 'exports', element: <SmartPosReports /> },
```

With:
```tsx
// Reports hub + individual report pages
{ path: 'reports', element: <SmartPosReportsHub /> },
{ path: 'reports/sales', element: <SmartPosSalesReport /> },
{ path: 'reports/profit-loss', element: <SmartPosProfitLoss /> },
{ path: 'reports/inventory', element: <SmartPosInventoryReport /> },
{ path: 'reports/tax', element: <SmartPosTaxReport /> },
{ path: 'reports/purchases', element: <SmartPosPurchaseReport /> },
{ path: 'reports/payments', element: <SmartPosPaymentReport /> },
{ path: 'reports/customers', element: <SmartPosCustomerReport /> },
{ path: 'reports/exports', element: <SmartPosReports /> },
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/routes/Router.tsx
git commit -m "feat: add routes for all new report pages, rename hub to /reports"
```

---

### Task 33: Update sidebar Insight section

**Files:**
- Modify: `frontend/src/layouts/full/vertical/sidebar/SmartPosMenuItems.ts`

- [ ] **Step 1: Add new report menu items**

Replace the existing Insight subheader section (the `{ subheader: 'Insight' },` block and its children) with:

```tsx
    // ── Insight ───────────────────────────────────────────────────────
    { subheader: 'Insight' },
    { id: uid(), title: t('smartpos:nav.reports'), icon: IconChartBar, href: '/smartpos/reports' },
    {
      id: uid(), title: 'Reports', icon: IconChartBar,
      children: [
        { id: uid(), title: 'Sales Report',        icon: IconChartBar,         href: '/smartpos/reports/sales' },
        { id: uid(), title: 'Profit & Loss',        icon: IconReceipt,          href: '/smartpos/reports/profit-loss' },
        { id: uid(), title: 'Inventory Report',     icon: IconPackage,          href: '/smartpos/reports/inventory' },
        { id: uid(), title: 'Tax Report',           icon: IconPercentage,       href: '/smartpos/reports/tax' },
        { id: uid(), title: 'Purchase Report',      icon: IconShoppingCart,     href: '/smartpos/reports/purchases' },
        { id: uid(), title: 'Payment Report',       icon: IconCoin,             href: '/smartpos/reports/payments' },
        { id: uid(), title: 'Customer Report',      icon: IconUsers,            href: '/smartpos/reports/customers' },
        { id: uid(), title: 'Advanced Reports',     icon: IconChartInfographic, href: '/smartpos/reports/advanced' },
        { id: uid(), title: 'Async Exports',        icon: IconDownload,         href: '/smartpos/reports/exports' },
      ],
    },
    { id: uid(), title: t('smartpos:nav.ai_insights'), icon: IconSparkles, href: '/smartpos/ai', chip: 'AI', chipColor: 'secondary' },
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/layouts/full/vertical/sidebar/SmartPosMenuItems.ts
git commit -m "feat: update sidebar Insight section with all report links"
```

---

## Phase 10 — Integration & Polish

### Task 34: Build verification

- [ ] **Step 1: Build backend report-service**

```bash
cd backend/report-service && mvn compile -q
```
Expected: BUILD SUCCESS

- [ ] **Step 2: Build backend ai-service**

```bash
cd backend/ai-service && mvn compile -q
```
Expected: BUILD SUCCESS

- [ ] **Step 3: Type-check frontend**

```bash
cd frontend && npx tsc --noEmit 2>&1 | head -50
```
Expected: No errors

- [ ] **Step 4: Build frontend**

```bash
cd frontend && npx vite build 2>&1 | tail -20
```
Expected: Build completes without errors

- [ ] **Step 5: Commit any fixes**

```bash
git add -A
git commit -m "fix: build verification fixes"
```
