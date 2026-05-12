package io.smartpos.report.application;

import io.smartpos.report.api.dto.CustomerSummaryDto;
import io.smartpos.report.api.dto.DashboardDto;
import io.smartpos.report.api.dto.PaymentSummaryDto;
import io.smartpos.report.api.dto.PurchaseSummaryDto;
import io.smartpos.report.api.dto.TaxSummaryDto;
import io.smartpos.report.domain.model.ExportJob;
import io.smartpos.report.infrastructure.export.CsvExporter;
import io.smartpos.report.infrastructure.export.PdfExporter;
import io.smartpos.report.infrastructure.export.XlsxExporter;
import io.smartpos.report.infrastructure.feign.DocumentFeign;
import io.smartpos.report.infrastructure.feign.SalesFeign;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Synchronous export dispatcher for Phase 6 v1.
 * Supported keys:
 *   sales-summary-series  — columns: date, net, count
 *   sales-top-products    — columns: productId, name, qty, revenue
 *   sales-top-customers   — columns: customerId, totalSpent, orderCount
 *
 * Phase 6b will add async job persistence (export_jobs table) and MinIO upload.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class ExportService {

    private final SalesReportService salesReports;
    private final TaxReportService taxReports;
    private final PurchaseReportService purchaseReports;
    private final PaymentReportService paymentReports;
    private final CustomerReportService customerReports;

    private final CsvExporter csv;
    private final XlsxExporter xlsx;
    private final PdfExporter pdf;

    private final DocumentFeign documentFeign;

    public record RenderedExport(String filename, String contentType, byte[] body) {}

    public RenderedExport run(String reportKey, ExportJob.Format format,
                              LocalDate from, LocalDate to, UUID warehouseId, int limit) {
        return switch (reportKey) {
            case "sales-summary-series" -> salesSeriesExport(format, from, to, warehouseId);
            case "sales-top-products"   -> topProductsExport(format, from, to, warehouseId, limit);
            case "sales-top-customers"  -> topCustomersExport(format, from, to, limit);
            case "tax-summary"       -> taxExport(format, from, to);
            case "purchases-summary" -> purchaseExport(format, from, to, warehouseId);
            case "payments-summary"  -> paymentExport(format, from, to);
            case "customers-summary" -> customerExport(format, from, to);
            default -> throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Unknown report key: " + reportKey);
        };
    }

    // ---- report renderers ----

    private RenderedExport salesSeriesExport(ExportJob.Format fmt, LocalDate from, LocalDate to, UUID warehouseId) {
        LocalDate priorFrom = from.minusDays(to.toEpochDay() - from.toEpochDay() + 1);
        LocalDate priorTo = from.minusDays(1);
        var summary = salesReports.summary(from, to, priorFrom, priorTo, warehouseId, null);
        List<String> headers = List.of("Date", "Net", "Sale count");
        List<List<Object>> rows = new ArrayList<>();
        for (DashboardDto.SeriesPoint p : summary.series()) {
            rows.add(List.of(p.date(), p.net(), p.count()));
        }
        return render(fmt, "sales-summary-series", "Sales summary",
                "From " + from + " to " + to, headers, rows);
    }

    private RenderedExport topProductsExport(ExportJob.Format fmt, LocalDate from, LocalDate to,
                                             UUID warehouseId, int limit) {
        var products = salesReports.topProducts(from, to, warehouseId, limit);
        List<String> headers = List.of("Product ID", "Name", "Qty sold", "Revenue");
        List<List<Object>> rows = new ArrayList<>();
        for (SalesFeign.TopProduct p : products) {
            rows.add(List.of(p.productId(), p.productName(), p.qty(), p.revenue()));
        }
        return render(fmt, "sales-top-products", "Top products",
                "From " + from + " to " + to, headers, rows);
    }

    private RenderedExport topCustomersExport(ExportJob.Format fmt, LocalDate from, LocalDate to, int limit) {
        var customers = salesReports.topCustomers(from, to, limit);
        List<String> headers = List.of("Customer ID", "Total spent", "Order count");
        List<List<Object>> rows = new ArrayList<>();
        for (SalesFeign.TopCustomer c : customers) {
            rows.add(List.of(c.customerId(), c.totalSpent(), c.orderCount()));
        }
        return render(fmt, "sales-top-customers", "Top customers",
                "From " + from + " to " + to, headers, rows);
    }

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
        LocalDate priorFrom = from.minusDays(to.toEpochDay() - from.toEpochDay() + 1);
        LocalDate priorTo = from.minusDays(1);
        PurchaseSummaryDto dto = purchaseReports.summary(from, to, priorFrom, priorTo, warehouseId);
        List<String> headers = List.of("Metric", "Value");
        List<List<Object>> rows = new ArrayList<>();
        rows.add(List.of("Count", dto.count()));
        rows.add(List.of("Gross", dto.gross()));
        rows.add(List.of("Paid", dto.paid()));
        rows.add(List.of("Due", dto.due()));
        rows.add(List.of("Avg Purchase", dto.avgPurchase()));
        return render(fmt, "purchases-summary", "Purchase Summary", "From " + from + " to " + to, headers, rows);
    }

    private RenderedExport paymentExport(ExportJob.Format fmt, LocalDate from, LocalDate to) {
        LocalDate priorFrom = from.minusDays(to.toEpochDay() - from.toEpochDay() + 1);
        LocalDate priorTo = from.minusDays(1);
        PaymentSummaryDto dto = paymentReports.summary(from, to, priorFrom, priorTo);
        List<String> headers = List.of("Method", "Total", "Count");
        List<List<Object>> rows = new ArrayList<>();
        for (PaymentSummaryDto.ByMethod r : dto.byMethod()) {
            rows.add(List.of(r.method(), r.total(), r.count()));
        }
        return render(fmt, "payments-summary", "Payment Summary", "From " + from + " to " + to, headers, rows);
    }

    private RenderedExport customerExport(ExportJob.Format fmt, LocalDate from, LocalDate to) {
        LocalDate priorFrom = from.minusDays(to.toEpochDay() - from.toEpochDay() + 1);
        LocalDate priorTo = from.minusDays(1);
        CustomerSummaryDto dto = customerReports.summary(from, to, priorFrom, priorTo);
        List<String> headers = List.of("Customer ID", "Name", "Orders", "Total Spent");
        List<List<Object>> rows = new ArrayList<>();
        for (CustomerSummaryDto.TopCustomer r : dto.topCustomers()) {
            rows.add(List.of(r.customerId(), r.customerName() != null ? r.customerName() : "—", r.orderCount(), r.totalSpent()));
        }
        return render(fmt, "customers-summary", "Customer Summary", "From " + from + " to " + to, headers, rows);
    }

    // ---- branded PDF via document-service ----

    /**
     * Render a report as a branded PDF by delegating to the document-service
     * template engine (Handlebars + Gotenberg). The generated PDF is stored in
     * MinIO and a presigned URL is returned.
     *
     * @param templateKey the document-service template key, e.g. {@code report-sales}
     * @param data        report data passed to the Handlebars template
     * @return a map containing {@code presignedUrl}, {@code id}, {@code documentNumber}
     */
    public Map<String, Object> renderReportPdf(String templateKey, Map<String, Object> data) {
        var req = new DocumentFeign.GenerateReportRequest(templateKey, data);
        Map<String, Object> result = documentFeign.generateReport(req);
        log.info("Generated branded PDF via document-service: templateKey={}, docId={}",
                templateKey, result.get("id"));
        return result;
    }

    // ---- dispatch on format ----

    private RenderedExport render(ExportJob.Format fmt, String filenameBase, String title, String subtitle,
                                  List<String> headers, List<List<Object>> rows) {
        return switch (fmt) {
            case CSV  -> new RenderedExport(filenameBase + ".csv",
                    "text/csv; charset=utf-8",
                    csv.render(headers, rows));
            case XLSX -> new RenderedExport(filenameBase + ".xlsx",
                    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                    xlsx.render(title, headers, rows));
            case PDF  -> new RenderedExport(filenameBase + ".pdf",
                    "application/pdf",
                    pdf.render(title, subtitle, headers, rows));
        };
    }
}
