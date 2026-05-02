package io.smartpos.report.application;

import io.smartpos.report.api.dto.DashboardDto;
import io.smartpos.report.domain.model.ExportJob;
import io.smartpos.report.infrastructure.export.CsvExporter;
import io.smartpos.report.infrastructure.export.PdfExporter;
import io.smartpos.report.infrastructure.export.XlsxExporter;
import io.smartpos.report.infrastructure.feign.SalesFeign;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
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
public class ExportService {

    private final SalesReportService salesReports;

    private final CsvExporter csv;
    private final XlsxExporter xlsx;
    private final PdfExporter pdf;

    public record RenderedExport(String filename, String contentType, byte[] body) {}

    public RenderedExport run(String reportKey, ExportJob.Format format,
                              LocalDate from, LocalDate to, UUID warehouseId, int limit) {
        return switch (reportKey) {
            case "sales-summary-series" -> salesSeriesExport(format, from, to, warehouseId);
            case "sales-top-products"   -> topProductsExport(format, from, to, warehouseId, limit);
            case "sales-top-customers"  -> topCustomersExport(format, from, to, limit);
            default -> throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Unknown report key: " + reportKey);
        };
    }

    // ---- report renderers ----

    private RenderedExport salesSeriesExport(ExportJob.Format fmt, LocalDate from, LocalDate to, UUID warehouseId) {
        var summary = salesReports.summary(from, to, warehouseId, null);
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
