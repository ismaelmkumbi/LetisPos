package io.smartpos.ai.application;

import io.smartpos.ai.api.dto.AssistantDtos;
import io.smartpos.ai.domain.model.AssistantDraft;
import io.smartpos.ai.domain.repository.AssistantDraftRepository;
import io.smartpos.ai.infrastructure.feign.*;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Component;

import io.smartpos.common.context.TenantContext;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.concurrent.atomic.AtomicLong;
import java.util.stream.Collectors;

@Component
public class AssistantToolExecutor {

    private final ReportFeign reportFeign;
    private final SalesFeign salesFeign;
    private final InventoryFeign inventoryFeign;
    private final ProductFeign productFeign;
    private final PaymentFeign paymentFeign;
    private final CustomerFeign customerFeign;
    private final AdminFeign adminFeign;
    private final AssistantDraftRepository draftRepo;
    private final ObjectMapper om = new ObjectMapper();

    public AssistantToolExecutor(ReportFeign reportFeign, SalesFeign salesFeign,
                                  InventoryFeign inventoryFeign, ProductFeign productFeign,
                                  PaymentFeign paymentFeign, CustomerFeign customerFeign,
                                  AdminFeign adminFeign, AssistantDraftRepository draftRepo) {
        this.reportFeign = reportFeign;
        this.salesFeign = salesFeign;
        this.inventoryFeign = inventoryFeign;
        this.productFeign = productFeign;
        this.paymentFeign = paymentFeign;
        this.customerFeign = customerFeign;
        this.adminFeign = adminFeign;
        this.draftRepo = draftRepo;
    }

    public AssistantDtos.ToolResult execute(String toolName, Map<String, Object> args, UUID userId) {
        return switch (toolName) {
            case "getExecutiveBriefing" -> getExecutiveBriefing(args);
            case "getSalesReport" -> getSalesReport(args);
            case "getTopProducts" -> getTopProducts(args);
            case "checkStock" -> checkStock(args);
            case "checkStockByProductSearch" -> checkStockByProductSearch(args);
            case "getTopCustomers" -> getTopCustomers(args);
            case "getFinancialSummary" -> getFinancialSummary(args);
            case "getExpiringStock" -> getExpiringStock(args);
            case "getLowStock" -> getLowStock(args);
            case "searchProducts" -> searchProducts(args);
            case "getRecentSales" -> getRecentSales(args);
            case "getStockOverview" -> getStockOverview(args);
            case "getStockByWarehouse" -> getStockByWarehouse(args);
            case "getSalesByCustomer" -> getSalesByCustomer(args);
            case "getSalesByStatus" -> getSalesByStatus(args);
            case "getProductDetail" -> getProductDetail(args);
            case "getProductsByCategory" -> getProductsByCategory(args);
            case "getProductsByBrand" -> getProductsByBrand(args);
            case "getInactiveProducts" -> getInactiveProducts(args);
            case "getProductCounts" -> getProductCounts(args);
            case "getProductMargins" -> getProductMargins(args);
            case "getProductPriceRange" -> getProductPriceRange(args);
            case "getProductInventory" -> getProductInventory(args);
            case "getProductSearch" -> getProductSearch(args);
            case "getDailySnapshot" -> getDailySnapshot(args);
            case "getExpenseSummary" -> getExpenseSummary(args);
            case "getSalesByPaymentMethod" -> getSalesByPaymentMethod(args);
            case "getSalesComparison" -> getSalesComparison(args);
            case "getDiscountSummary" -> getDiscountSummary(args);
            case "getTaxSummary" -> getTaxSummary(args);
            case "getTenantList" -> getTenantList(args);
            case "listTenants" -> getTenantList(args); // backwards compat
            case "getPlatformStats" -> getPlatformStats(args);
            case "getPlatformSales" -> getPlatformSales(args);
            case "getTenantDetail" -> getTenantDetail(args);
            default -> throw new IllegalArgumentException("Unknown tool: " + toolName);
        };
    }

    public AssistantDraft createDraft(String toolName, Map<String, Object> args,
                                       String summary, UUID userId, UUID tenantId) {
        AssistantDraft draft = new AssistantDraft();
        draft.setUserId(userId);
        draft.setTenantId(tenantId);
        draft.setToolName(toolName);
        draft.setToolInput(toJson(args));
        draft.setSummary(summary);
        draft.setExpiresAt(Instant.now().plus(5, ChronoUnit.MINUTES));
        return draftRepo.save(draft);
    }

    public AssistantDtos.ToolResult executeDraft(UUID draftId, UUID userId) {
        AssistantDraft draft = draftRepo.findById(draftId)
            .orElseThrow(() -> new IllegalArgumentException("Draft not found"));
        if (draft.getStatus() != AssistantDraft.DraftStatus.PENDING) {
            throw new IllegalStateException("Draft already " + draft.getStatus());
        }
        if (draft.getExpiresAt().isBefore(Instant.now())) {
            draft.setStatus(AssistantDraft.DraftStatus.EXPIRED);
            draftRepo.save(draft);
            throw new IllegalStateException("Draft expired");
        }
        Map<String, Object> args = parseJson(draft.getToolInput());
        AssistantDtos.ToolResult result = executeWrite(draft.getToolName(), args, userId);
        draft.setStatus(AssistantDraft.DraftStatus.CONFIRMED);
        draftRepo.save(draft);
        return result;
    }

    public void rejectDraft(UUID draftId) {
        AssistantDraft draft = draftRepo.findById(draftId)
            .orElseThrow(() -> new IllegalArgumentException("Draft not found"));
        draft.setStatus(AssistantDraft.DraftStatus.REJECTED);
        draftRepo.save(draft);
    }

    private AssistantDtos.ToolResult executeWrite(String toolName, Map<String, Object> args, UUID userId) {
        return switch (toolName) {
            case "createPurchaseOrder" -> createPurchaseOrder(args, userId);
            case "adjustStock" -> adjustStock(args);
            case "createExpense" -> createExpense(args, userId);
            default -> throw new IllegalArgumentException("Unknown write tool: " + toolName);
        };
    }

    // ── Read tool implementations ──

    private AssistantDtos.ToolResult getExecutiveBriefing(Map<String, Object> args) {
        LocalDate date = dateArg(args, "date", LocalDate.now().minusDays(1));
        LocalDate previousDay = date.minusDays(1);
        LocalDate weekComparisonDate = date.minusWeeks(1);
        int topLimit = intArg(args, "topLimit", 5, 1, 10);
        int expiryDays = intArg(args, "expiryDays", 14, 1, 90);

        var day = reportFeign.salesSummary(date.toString(), date.toString(), null, null);
        var prior = reportFeign.salesSummary(previousDay.toString(), previousDay.toString(), null, null);
        var lastWeek = reportFeign.salesSummary(weekComparisonDate.toString(), weekComparisonDate.toString(), null, null);
        var topProducts = reportFeign.topProducts(date.toString(), date.toString(), null, topLimit);
        var topCustomers = reportFeign.topCustomers(date.toString(), date.toString(), topLimit);
        var lowStockPage = inventoryFeign.lowStockAlerts(null,
            org.springframework.data.domain.Pageable.ofSize(10));
        var expiring = inventoryFeign.expiringSoon(expiryDays);

        Map<String, Object> data = new LinkedHashMap<>();
        data.put("date", date.toString());
        data.put("currency", "TZS");
        data.put("headline", briefingHeadline(day.gross(), prior.gross(), lowStockPage.getContent().size(), expiring.size()));
        data.put("recommendedAction", recommendedAction(topProducts, lowStockPage.getContent(), expiring));
        data.put("metrics", List.of(
            metric("Sales", day.gross(), "Gross sales", percentChange(day.gross(), prior.gross()), "vs " + previousDay),
            metric("Transactions", day.salesCount(), "Completed sales", percentChange(day.salesCount(), prior.salesCount()), "vs " + previousDay),
            metric("Avg Basket", day.averageBasket(), "Average basket", percentChange(day.averageBasket(), prior.averageBasket()), "vs " + previousDay),
            metric("Week Check", day.gross(), "Same weekday last week", percentChange(day.gross(), lastWeek.gross()), "vs " + weekComparisonDate)
        ));
        data.put("sections", List.of(
            section("Top products", "ranking", topProducts.stream()
                .map(p -> item(p.productName(), p.net(), p.qty() + " sold"))
                .collect(Collectors.toList())),
            section("Top customers", "ranking", topCustomers.stream()
                .map(c -> item(c.customerName(), c.net(), c.sales() + " sales"))
                .collect(Collectors.toList())),
            section("Low-stock risks", "table", lowStockPage.getContent().stream().limit(5)
                .map(i -> item(i.productId().toString(), i.available(), "threshold " + i.stockAlertThreshold()))
                .collect(Collectors.toList())),
            section("Expiry watch", "table", expiring.stream().limit(5)
                .map(i -> item(i.productName(), i.quantity(), "expires " + i.expiryDate()))
                .collect(Collectors.toList()))
        ));
        return new AssistantDtos.ToolResult("briefing", "Executive Briefing — " + date, data);
    }

    private AssistantDtos.ToolResult getSalesReport(Map<String, Object> args) {
        LocalDate from = dateArg(args, "dateFrom", LocalDate.now());
        LocalDate to = dateArg(args, "dateTo", from);
        var summary = reportFeign.salesSummary(from.toString(), to.toString(), null, null);
        Map<String, Object> data = new LinkedHashMap<>();
        data.put("from", from.toString());
        data.put("to", to.toString());
        data.put("count", summary.salesCount());
        data.put("total", summary.gross());
        data.put("currency", "TZS");
        data.put("primaryLabel", "Gross sales");
        data.put("secondaryLabel", summary.salesCount() + " sales");
        return new AssistantDtos.ToolResult("metric",
            "Sales " + from + " to " + to, data);
    }

    private AssistantDtos.ToolResult getTopProducts(Map<String, Object> args) {
        int limit = intArg(args, "limit", 5, 1, 20);
        LocalDate from = dateArg(args, "dateFrom", LocalDate.now().minusDays(30));
        LocalDate to = dateArg(args, "dateTo", LocalDate.now());
        var products = reportFeign.topProducts(from.toString(), to.toString(), null, limit);
        Map<String, Object> data = new LinkedHashMap<>();
        data.put("from", from.toString());
        data.put("to", to.toString());
        data.put("currency", "TZS");
        data.put("valueLabel", "Net sales");
        data.put("items", products.stream().map(p -> {
            Map<String, Object> item = new LinkedHashMap<>();
            item.put("name", p.productName());
            item.put("value", p.net());
            item.put("subtitle", "Net sales");
            return item;
        }).collect(Collectors.toList()));
        return new AssistantDtos.ToolResult("ranking", "Top " + limit + " Products", data);
    }

    private AssistantDtos.ToolResult checkStock(Map<String, Object> args) {
        String productIdRaw = (String) args.get("productId");
        if ((productIdRaw == null || productIdRaw.isBlank()) && args.get("productIds") instanceof List<?> ids && !ids.isEmpty()) {
            productIdRaw = String.valueOf(ids.get(0));
        }
        if (productIdRaw == null || productIdRaw.isBlank()) {
            throw new IllegalArgumentException("A productId is required. Search products first when you only have a product name.");
        }
        UUID productId = UUID.fromString(productIdRaw);
        UUID warehouseId = args.containsKey("warehouseId")
            ? UUID.fromString((String) args.get("warehouseId")) : null;
        var stock = inventoryFeign.stockLevel(productId, warehouseId);
        Map<String, Object> data = new LinkedHashMap<>();
        data.put("columns", List.of("Field","Value"));
        data.put("rows", stock.entrySet().stream()
            .map(e -> List.of(e.getKey(), String.valueOf(e.getValue())))
            .collect(Collectors.toList()));
        return new AssistantDtos.ToolResult("table", "Stock Level", data);
    }

    private AssistantDtos.ToolResult checkStockByProductSearch(Map<String, Object> args) {
        String query = String.valueOf(args.getOrDefault("query", "")).trim();
        if (query.isBlank()) {
            throw new IllegalArgumentException("A product name, SKU, or barcode is required.");
        }
        var page = productFeign.search(query, null, null, null,
            org.springframework.data.domain.Pageable.ofSize(5));
        var products = page.getContent();
        if (products.isEmpty()) {
            return new AssistantDtos.ToolResult("text", "No product found",
                Map.of("message", "No product matched '" + query + "'. Try a clearer product name, SKU, or barcode."));
        }

        UUID warehouseId = args.containsKey("warehouseId")
            ? UUID.fromString((String) args.get("warehouseId")) : null;
        Map<String, Object> data = new LinkedHashMap<>();
        data.put("columns", List.of("Product","SKU","Field","Value"));
        List<List<Object>> rows = new ArrayList<>();
        for (var product : products) {
            var stock = inventoryFeign.stockLevel(product.id(), warehouseId);
            stock.forEach((field, value) -> rows.add(List.of(
                product.name(),
                product.sku() != null ? product.sku() : "",
                field,
                String.valueOf(value)
            )));
        }
        data.put("rows", rows);
        data.put("matchedProducts", products.size());
        return new AssistantDtos.ToolResult("table",
            "Stock for " + query + " (" + products.size() + " match" + (products.size() == 1 ? "" : "es") + ")", data);
    }

    private AssistantDtos.ToolResult getTopCustomers(Map<String, Object> args) {
        int limit = intArg(args, "limit", 5, 1, 20);
        LocalDate from = dateArg(args, "dateFrom", LocalDate.now().minusDays(30));
        LocalDate to = dateArg(args, "dateTo", LocalDate.now());
        var customers = reportFeign.topCustomers(from.toString(), to.toString(), limit);
        Map<String, Object> data = new LinkedHashMap<>();
        data.put("from", from.toString());
        data.put("to", to.toString());
        data.put("currency", "TZS");
        data.put("valueLabel", "Net sales");
        data.put("items", customers.stream().map(c -> {
            Map<String, Object> item = new LinkedHashMap<>();
            item.put("name", c.customerName());
            item.put("value", c.net());
            item.put("subtitle", c.sales() + " purchases");
            return item;
        }).collect(Collectors.toList()));
        return new AssistantDtos.ToolResult("ranking", "Top " + limit + " Customers", data);
    }

    private AssistantDtos.ToolResult getFinancialSummary(Map<String, Object> args) {
        LocalDate from = dateArg(args, "dateFrom", LocalDate.now().minusDays(30));
        LocalDate to = dateArg(args, "dateTo", LocalDate.now());
        var summary = reportFeign.salesSummary(from.toString(), to.toString(), null, null);
        Map<String, Object> data = new LinkedHashMap<>();
        data.put("currency", "TZS");
        data.put("items", List.of(Map.of(
            "name", "Gross revenue",
            "value", summary.gross(),
            "subtitle", summary.salesCount() + " sales"
        )));
        return new AssistantDtos.ToolResult("metric",
            "Finance " + from + " to " + to, data);
    }

    private AssistantDtos.ToolResult getExpiringStock(Map<String, Object> args) {
        int days = intArg(args, "daysFromNow", 30, 1, 365);
        var items = inventoryFeign.expiringSoon(days);
        Map<String, Object> data = new LinkedHashMap<>();
        data.put("columns", List.of("Product","Expiry Date","Quantity"));
        data.put("rows", items.stream().map(i -> List.of(
            i.productName(), i.expiryDate().toString(), i.quantity()))
            .collect(Collectors.toList()));
        return new AssistantDtos.ToolResult("table",
            "Expiring Within " + days + " Days", data);
    }

    private AssistantDtos.ToolResult getLowStock(Map<String, Object> args) {
        UUID warehouseId = args.containsKey("warehouseId")
            ? UUID.fromString((String) args.get("warehouseId")) : null;
        var page = inventoryFeign.lowStockAlerts(warehouseId,
            org.springframework.data.domain.Pageable.ofSize(20));
        var items = page.getContent();
        Map<String, Object> data = new LinkedHashMap<>();
        data.put("columns", List.of("Product ID","On Hand","Available","Alert Threshold"));
        data.put("rows", items.stream().map(i -> List.of(
            i.productId().toString(), i.onHand(), i.available(),
            i.stockAlertThreshold())).collect(Collectors.toList()));
        return new AssistantDtos.ToolResult("table",
            "Low Stock (" + items.size() + " items)", data);
    }

    private AssistantDtos.ToolResult searchProducts(Map<String, Object> args) {
        String query = (String) args.get("query");
        int limit = intArg(args, "limit", 10, 1, 25);
        var page = productFeign.search(query, null, null, null,
            org.springframework.data.domain.Pageable.ofSize(limit));
        var products = page.getContent();
        Map<String, Object> data = new LinkedHashMap<>();
        data.put("columns", List.of("Name","SKU","Price"));
        data.put("rows", products.stream().map(p -> List.of(
            p.name(), p.sku(), p.price())).collect(Collectors.toList()));
        return new AssistantDtos.ToolResult("table",
            "Search: " + query + " (" + products.size() + " results)", data);
    }

    private AssistantDtos.ToolResult getRecentSales(Map<String, Object> args) {
        int limit = intArg(args, "limit", 10, 1, 25);
        var page = salesFeign.search(null, null, null, null, null, 0, limit);
        var sales = page.content();
        Map<String, Object> data = new LinkedHashMap<>();
        data.put("columns", List.of("Ref","Date","Status","Total"));
        data.put("rows", sales.stream().map(s -> List.of(
            s.ref(), s.date().toString(), s.status(),
            s.grandTotal())).collect(Collectors.toList()));
        return new AssistantDtos.ToolResult("table",
            "Recent Sales (" + sales.size() + ")", data);
    }

    private AssistantDtos.ToolResult getStockOverview(Map<String, Object> args) {
        int limit = intArg(args, "limit", 50, 1, 200);
        var page = productFeign.search(null, null, null, null,
            org.springframework.data.domain.Pageable.ofSize(limit));
        var products = page.getContent();
        Map<String, Object> data = new LinkedHashMap<>();
        // Summary metrics
        long totalProducts = page.getTotalElements();
        data.put("totalProducts", totalProducts);
        data.put("displayedProducts", products.size());
        data.put("columns", List.of("Product","SKU","Price","Stock"));
        List<List<Object>> rows = new ArrayList<>();
        for (var product : products) {
            try {
                var stock = inventoryFeign.stockLevel(product.id(), null);
                rows.add(List.of(
                    product.name(),
                    product.sku() != null ? product.sku() : "",
                    product.price(),
                    String.valueOf(stock.getOrDefault("available", stock.getOrDefault("quantity", "?")))
                ));
            } catch (Exception e) {
                rows.add(List.of(product.name(), product.sku(), product.price(), "?"));
            }
        }
        data.put("rows", rows);
        return new AssistantDtos.ToolResult("table",
            "Stock Overview (" + totalProducts + " products)", data);
    }

    private AssistantDtos.ToolResult getStockByWarehouse(Map<String, Object> args) {
        UUID warehouseId = args.containsKey("warehouseId")
            ? UUID.fromString((String) args.get("warehouseId")) : null;
        var summary = inventoryFeign.warehouseSummary(warehouseId);
        Map<String, Object> data = new LinkedHashMap<>();
        data.put("columns", List.of("Field","Value"));
        data.put("rows", summary.entrySet().stream()
            .map(e -> List.of(e.getKey(), String.valueOf(e.getValue())))
            .collect(Collectors.toList()));
        return new AssistantDtos.ToolResult("table", "Stock by Warehouse", data);
    }

    private AssistantDtos.ToolResult getSalesByCustomer(Map<String, Object> args) {
        UUID customerId = UUID.fromString((String) args.get("customerId"));
        LocalDate from = dateArg(args, "dateFrom", LocalDate.now().minusDays(30));
        LocalDate to = dateArg(args, "dateTo", LocalDate.now());
        var summary = reportFeign.salesSummary(from.toString(), to.toString(), null, customerId);
        Map<String, Object> data = new LinkedHashMap<>();
        data.put("customerId", customerId.toString());
        data.put("from", from.toString());
        data.put("to", to.toString());
        data.put("total", summary.gross());
        data.put("currency", "TZS");
        data.put("count", summary.salesCount());
        data.put("primaryLabel", "Total purchases");
        data.put("secondaryLabel", summary.salesCount() + " transactions");
        return new AssistantDtos.ToolResult("metric",
            "Customer Sales " + from + " to " + to, data);
    }

    private AssistantDtos.ToolResult getSalesByStatus(Map<String, Object> args) {
        String status = (String) args.get("status");
        LocalDate from = dateArg(args, "dateFrom", LocalDate.now().minusDays(30));
        LocalDate to = dateArg(args, "dateTo", LocalDate.now());
        int limit = intArg(args, "limit", 25, 1, 50);
        var page = salesFeign.search(from, to, null, null, status, 0, limit);
        Map<String, Object> data = new LinkedHashMap<>();
        data.put("columns", List.of("Ref","Date","Customer","Total"));
        data.put("rows", page.content().stream().map(s -> List.of(
            s.ref(), s.date().toString(),
            s.customerId() != null ? s.customerId().toString() : "",
            s.grandTotal())).collect(Collectors.toList()));
        return new AssistantDtos.ToolResult("table",
            status + " Sales (" + page.content().size() + ")", data);
    }

    private AssistantDtos.ToolResult getProductDetail(Map<String, Object> args) {
        String query = (String) args.get("query");
        var page = productFeign.search(query, null, null, null,
            org.springframework.data.domain.Pageable.ofSize(3));
        var products = page.getContent();
        if (products.isEmpty()) {
            return new AssistantDtos.ToolResult("text", "Product not found: " + query,
                Map.of("message", "No product matched '" + query + "'."));
        }
        var product = products.get(0);
        Map<String, Object> stock = Map.of();
        try { stock = inventoryFeign.stockLevel(product.id(), null); } catch (Exception ignored) {}
        Map<String, Object> data = new LinkedHashMap<>();
        data.put("columns", List.of("Field","Value"));
        Map<String, Object> details = new LinkedHashMap<>();
        details.put("Name", product.name());
        details.put("SKU", product.sku() != null ? product.sku() : "N/A");
        details.put("Price", product.price());
        details.put("Cost", product.cost() != null ? product.cost() : "N/A");
        details.put("Category", product.categoryId() != null ? product.categoryId().toString() : "N/A");
        stock.forEach((k, v) -> details.put("Stock " + k, v));
        data.put("rows", details.entrySet().stream()
            .map(e -> List.of(e.getKey(), String.valueOf(e.getValue())))
            .collect(Collectors.toList()));
        if (products.size() > 1) {
            data.put("note", products.size() + " products matched. Showing first match: " + product.name());
        }
        return new AssistantDtos.ToolResult("table", "Product: " + product.name(), data);
    }

    private AssistantDtos.ToolResult getProductsByCategory(Map<String, Object> args) {
        UUID categoryId = UUID.fromString((String) args.get("categoryId"));
        int limit = intArg(args, "limit", 50, 1, 200);
        var page = productFeign.search(null, categoryId, null, null,
            org.springframework.data.domain.Pageable.ofSize(limit));
        var products = page.getContent();
        Map<String, Object> data = new LinkedHashMap<>();
        data.put("columns", List.of("Name","SKU","Price","Status"));
        data.put("rows", products.stream().map(p -> List.of(
            p.name(), p.sku() != null ? p.sku() : "",
            p.price(), p.status() ? "Active" : "Inactive"))
            .collect(Collectors.toList()));
        data.put("totalInCategory", page.getTotalElements());
        return new AssistantDtos.ToolResult("table",
            "Products in Category (" + products.size() + " of " + page.getTotalElements() + ")", data);
    }

    private AssistantDtos.ToolResult getProductsByBrand(Map<String, Object> args) {
        UUID brandId = UUID.fromString((String) args.get("brandId"));
        int limit = intArg(args, "limit", 50, 1, 200);
        var page = productFeign.search(null, null, brandId, null,
            org.springframework.data.domain.Pageable.ofSize(limit));
        var products = page.getContent();
        Map<String, Object> data = new LinkedHashMap<>();
        data.put("columns", List.of("Name","SKU","Price","Status"));
        data.put("rows", products.stream().map(p -> List.of(
            p.name(), p.sku() != null ? p.sku() : "",
            p.price(), p.status() ? "Active" : "Inactive"))
            .collect(Collectors.toList()));
        return new AssistantDtos.ToolResult("table",
            "Products by Brand (" + products.size() + ")", data);
    }

    private AssistantDtos.ToolResult getInactiveProducts(Map<String, Object> args) {
        int limit = intArg(args, "limit", 50, 1, 200);
        var page = productFeign.search(null, null, null, false,
            org.springframework.data.domain.Pageable.ofSize(limit));
        var products = page.getContent();
        Map<String, Object> data = new LinkedHashMap<>();
        data.put("columns", List.of("Name","SKU","Price"));
        data.put("rows", products.stream().map(p -> List.of(
            p.name(), p.sku() != null ? p.sku() : "", p.price()))
            .collect(Collectors.toList()));
        return new AssistantDtos.ToolResult("table",
            "Inactive Products (" + products.size() + ")", data);
    }

    private AssistantDtos.ToolResult getProductCounts(Map<String, Object> args) {
        var activePage = productFeign.search(null, null, null, true,
            org.springframework.data.domain.Pageable.ofSize(1));
        var inactivePage = productFeign.search(null, null, null, false,
            org.springframework.data.domain.Pageable.ofSize(1));
        long totalActive = activePage.getTotalElements();
        long totalInactive = inactivePage.getTotalElements();
        long totalAll = totalActive + totalInactive;
        Map<String, Object> data = new LinkedHashMap<>();
        data.put("columns", List.of("Metric","Count"));
        data.put("rows", List.of(
            List.of("Total Products", totalAll),
            List.of("Active", totalActive),
            List.of("Inactive", totalInactive)
        ));
        return new AssistantDtos.ToolResult("table",
            "Product Counts — " + totalAll + " total", data);
    }

    private AssistantDtos.ToolResult getProductMargins(Map<String, Object> args) {
        int limit = intArg(args, "limit", 10, 1, 50);
        var page = productFeign.search(null, null, null, true,
            org.springframework.data.domain.Pageable.ofSize(200));
        var products = page.getContent();
        // Compute margins
        record MarginInfo(String name, BigDecimal price, BigDecimal cost, BigDecimal margin, double marginPct) {}
        var margins = products.stream()
            .filter(p -> p.cost() != null && p.cost().compareTo(BigDecimal.ZERO) > 0)
            .map(p -> {
                BigDecimal margin = p.price().subtract(p.cost());
                double pct = p.cost().compareTo(BigDecimal.ZERO) > 0
                    ? margin.divide(p.price(), 4, java.math.RoundingMode.HALF_UP)
                        .multiply(BigDecimal.valueOf(100)).doubleValue()
                    : 0;
                return new MarginInfo(p.name(), p.price(), p.cost(), margin, pct);
            })
            .sorted((a, b) -> Double.compare(b.marginPct, a.marginPct))
            .toList();
        Map<String, Object> data = new LinkedHashMap<>();
        data.put("currency", "TZS");
        data.put("columns", List.of("Product","Price","Cost","Margin","Margin %"));
        data.put("rows", margins.stream().limit(limit).map(m -> List.of(
            m.name, m.price, m.cost, m.margin, String.format("%.1f%%", m.marginPct)))
            .collect(Collectors.toList()));
        if (margins.size() > limit) {
            // Also show worst margins
            var worst = margins.subList(Math.max(0, margins.size() - 5), margins.size());
            data.put("worstMargins", worst.stream().map(m -> List.of(
                m.name, m.margin, String.format("%.1f%%", m.marginPct)))
                .collect(Collectors.toList()));
        }
        return new AssistantDtos.ToolResult("table",
            "Product Margins — Top " + Math.min(limit, margins.size()), data);
    }

    private AssistantDtos.ToolResult getProductPriceRange(Map<String, Object> args) {
        var page = productFeign.search(null, null, null, true,
            org.springframework.data.domain.Pageable.ofSize(500));
        var products = page.getContent();
        if (products.isEmpty()) {
            return new AssistantDtos.ToolResult("text", "Price Range",
                Map.of("message", "No active products found."));
        }
        BigDecimal min = products.stream().map(ProductFeign.ProductDto::price)
            .filter(Objects::nonNull).min(BigDecimal::compareTo).orElse(BigDecimal.ZERO);
        BigDecimal max = products.stream().map(ProductFeign.ProductDto::price)
            .filter(Objects::nonNull).max(BigDecimal::compareTo).orElse(BigDecimal.ZERO);
        BigDecimal avg = products.stream().map(ProductFeign.ProductDto::price)
            .filter(Objects::nonNull)
            .reduce(BigDecimal.ZERO, BigDecimal::add)
            .divide(BigDecimal.valueOf(products.stream().filter(p -> p.price() != null).count()),
                2, java.math.RoundingMode.HALF_UP);
        // Price ranges
        long under5k = products.stream().filter(p -> p.price().compareTo(new BigDecimal("5000")) < 0).count();
        long between5k20k = products.stream().filter(p -> p.price().compareTo(new BigDecimal("5000")) >= 0
            && p.price().compareTo(new BigDecimal("20000")) <= 0).count();
        long above20k = products.stream().filter(p -> p.price().compareTo(new BigDecimal("20000")) > 0).count();
        Map<String, Object> data = new LinkedHashMap<>();
        data.put("currency", "TZS");
        data.put("totalProducts", products.size());
        data.put("items", List.of(
            Map.of("name", "Cheapest product", "value", min, "subtitle", "Minimum price"),
            Map.of("name", "Most expensive", "value", max, "subtitle", "Maximum price"),
            Map.of("name", "Average price", "value", avg, "subtitle", "Mean across " + products.size() + " products")
        ));
        data.put("distribution", List.of(
            item("Under TZS 5,000", under5k, under5k + " products"),
            item("TZS 5,000 - 20,000", between5k20k, between5k20k + " products"),
            item("Above TZS 20,000", above20k, above20k + " products")
        ));
        return new AssistantDtos.ToolResult("metric",
            "Product Price Range", data);
    }

    private AssistantDtos.ToolResult getProductInventory(Map<String, Object> args) {
        int limit = intArg(args, "limit", 50, 1, 100);
        var page = productFeign.search(null, null, null, true,
            org.springframework.data.domain.Pageable.ofSize(limit));
        var products = page.getContent();
        Map<String, Object> data = new LinkedHashMap<>();
        data.put("columns", List.of("Product","SKU","Price","In Stock"));
        List<List<Object>> rows = new ArrayList<>();
        for (var product : products) {
            String stockStr = "?";
            try {
                var stock = inventoryFeign.stockLevel(product.id(), null);
                stockStr = String.valueOf(stock.getOrDefault("available", stock.getOrDefault("quantity", "?")));
            } catch (Exception ignored) {}
            rows.add(List.of(product.name(), product.sku() != null ? product.sku() : "", product.price(), stockStr));
        }
        data.put("rows", rows);
        data.put("totalShown", products.size());
        return new AssistantDtos.ToolResult("table",
            "Product Inventory (" + products.size() + " items)", data);
    }

    private AssistantDtos.ToolResult getProductSearch(Map<String, Object> args) {
        String query = (String) args.get("query");
        UUID categoryId = args.containsKey("categoryId") && args.get("categoryId") != null
            ? UUID.fromString((String) args.get("categoryId")) : null;
        UUID brandId = args.containsKey("brandId") && args.get("brandId") != null
            ? UUID.fromString((String) args.get("brandId")) : null;
        int limit = intArg(args, "limit", 25, 1, 100);
        var page = productFeign.search(query, categoryId, brandId, true,
            org.springframework.data.domain.Pageable.ofSize(limit));
        var products = page.getContent();
        Map<String, Object> data = new LinkedHashMap<>();
        data.put("columns", List.of("Name","SKU","Price","Category"));
        data.put("rows", products.stream().map(p -> List.of(
            p.name(), p.sku() != null ? p.sku() : "", p.price(),
            p.categoryId() != null ? p.categoryId().toString() : ""))
            .collect(Collectors.toList()));
        data.put("totalResults", page.getTotalElements());
        return new AssistantDtos.ToolResult("table",
            "Search: " + query + " (" + products.size() + " of " + page.getTotalElements() + ")", data);
    }

    private AssistantDtos.ToolResult getDailySnapshot(Map<String, Object> args) {
        LocalDate today = LocalDate.now();
        var sales = reportFeign.salesSummary(today.toString(), today.toString(), null, null);
        var lowStock = inventoryFeign.lowStockAlerts(null,
            org.springframework.data.domain.Pageable.ofSize(5));
        var expiring = inventoryFeign.expiringSoon(14);
        Map<String, Object> data = new LinkedHashMap<>();
        data.put("date", today.toString());
        data.put("currency", "TZS");
        data.put("headline", "Today's sales: TZS " + sales.gross() + " (" + sales.salesCount() + " transactions)");
        data.put("lowStockCount", lowStock.getContent().size());
        data.put("expiringCount", expiring.size());
        data.put("metrics", List.of(
            metric("Today's Sales", sales.gross(), sales.salesCount() + " transactions", null, ""),
            metric("Low Stock Items", lowStock.getContent().size(), "Below reorder threshold", null, ""),
            metric("Expiring Soon", expiring.size(), "Within 14 days", null, "")
        ));
        data.put("sections", List.of(
            section("Today's sales", "metric", List.of(item("Gross revenue", sales.gross(), sales.salesCount() + " sales"))),
            section("Low-stock risks", "table", lowStock.getContent().stream().limit(5)
                .map(i -> item(i.productId().toString(), i.available(), "threshold " + i.stockAlertThreshold()))
                .collect(Collectors.toList())),
            section("Expiry watch", "table", expiring.stream().limit(5)
                .map(i -> item(i.productName(), i.quantity(), "expires " + i.expiryDate()))
                .collect(Collectors.toList()))
        ));
        return new AssistantDtos.ToolResult("briefing", "Daily Snapshot — " + today, data);
    }

    private AssistantDtos.ToolResult getExpenseSummary(Map<String, Object> args) {
        Map<String, Object> data = new LinkedHashMap<>();
        data.put("message", "Expense tracking via assistant is coming soon. For now, use the Finance page to view and record expenses. I can record an expense for you — just tell me the category, amount, and description.");
        return new AssistantDtos.ToolResult("text", "Expense Summary", data);
    }

    private AssistantDtos.ToolResult getSalesByPaymentMethod(Map<String, Object> args) {
        LocalDate from = dateArg(args, "dateFrom", LocalDate.now().minusDays(30));
        LocalDate to = dateArg(args, "dateTo", LocalDate.now());
        var page = salesFeign.search(from, to, null, null, null, 0, 1000);
        var sales = page.content();
        Map<String, BigDecimal> byMethod = sales.stream()
            .collect(Collectors.groupingBy(
                s -> s.paymentStatus() != null ? s.paymentStatus() : "UNKNOWN",
                LinkedHashMap::new,
                Collectors.reducing(BigDecimal.ZERO, SalesFeign.SaleSummary::grandTotal, BigDecimal::add)));
        Map<String, Long> counts = sales.stream()
            .collect(Collectors.groupingBy(
                s -> s.paymentStatus() != null ? s.paymentStatus() : "UNKNOWN",
                LinkedHashMap::new,
                Collectors.counting()));
        Map<String, Object> data = new LinkedHashMap<>();
        data.put("from", from.toString());
        data.put("to", to.toString());
        data.put("currency", "TZS");
        data.put("columns", List.of("Payment Status", "Total", "Count"));
        List<List<Object>> rows = new ArrayList<>();
        for (String method : byMethod.keySet()) {
            rows.add(List.of(method, byMethod.get(method), counts.getOrDefault(method, 0L)));
        }
        data.put("rows", rows);
        return new AssistantDtos.ToolResult("table",
            "Sales by Payment Method " + from + " to " + to, data);
    }

    private AssistantDtos.ToolResult getSalesComparison(Map<String, Object> args) {
        LocalDate p1From = dateArg(args, "period1From", LocalDate.now().minusDays(7));
        LocalDate p1To = dateArg(args, "period1To", LocalDate.now());
        LocalDate p2From = dateArg(args, "period2From", LocalDate.now().minusDays(14));
        LocalDate p2To = dateArg(args, "period2To", LocalDate.now().minusDays(8));
        var p1 = reportFeign.salesSummary(p1From.toString(), p1To.toString(), null, null);
        var p2 = reportFeign.salesSummary(p2From.toString(), p2To.toString(), null, null);
        Map<String, Object> data = new LinkedHashMap<>();
        data.put("currency", "TZS");
        data.put("columns", List.of("Metric", "Period 1", "Period 2", "Change"));
        data.put("rows", List.of(
            List.of("Gross Sales", p1.gross(), p2.gross(),
                String.format("%+.1f%%", percentChange(p1.gross(), p2.gross()))),
            List.of("Transactions", p1.salesCount(), p2.salesCount(),
                String.format("%+.1f%%", percentChange(p1.salesCount(), p2.salesCount()))),
            List.of("Avg Basket", p1.averageBasket(), p2.averageBasket(),
                String.format("%+.1f%%", percentChange(p1.averageBasket(), p2.averageBasket())))
        ));
        data.put("period1Label", p1From + " to " + p1To);
        data.put("period2Label", p2From + " to " + p2To);
        return new AssistantDtos.ToolResult("table",
            "Sales Comparison: " + p1From + " to " + p1To + " vs " + p2From + " to " + p2To, data);
    }

    private AssistantDtos.ToolResult getDiscountSummary(Map<String, Object> args) {
        LocalDate from = dateArg(args, "dateFrom", LocalDate.now().minusDays(30));
        LocalDate to = dateArg(args, "dateTo", LocalDate.now());
        var page = salesFeign.search(from, to, null, null, null, 0, 1000);
        var sales = page.content();
        BigDecimal totalDiscount = sales.stream()
            .map(SalesFeign.SaleSummary::discountTotal)
            .filter(Objects::nonNull)
            .reduce(BigDecimal.ZERO, BigDecimal::add);
        long salesWithDiscount = sales.stream()
            .filter(s -> s.discountTotal() != null && s.discountTotal().compareTo(BigDecimal.ZERO) > 0)
            .count();
        Map<String, Object> data = new LinkedHashMap<>();
        data.put("from", from.toString());
        data.put("to", to.toString());
        data.put("currency", "TZS");
        data.put("items", List.of(
            Map.of("name", "Total discounts", "value", totalDiscount, "subtitle", "Across " + sales.size() + " sales"),
            Map.of("name", "Sales with discounts", "value", salesWithDiscount, "subtitle",
                sales.size() > 0 ? String.format("%.0f%%", (double) salesWithDiscount / sales.size() * 100) : "0%"),
            Map.of("name", "Avg discount per sale", "value",
                salesWithDiscount > 0 ? totalDiscount.divide(BigDecimal.valueOf(salesWithDiscount), 2, java.math.RoundingMode.HALF_UP) : BigDecimal.ZERO,
                "subtitle", "Per discounted sale")
        ));
        return new AssistantDtos.ToolResult("metric",
            "Discount Summary " + from + " to " + to, data);
    }

    private AssistantDtos.ToolResult getTaxSummary(Map<String, Object> args) {
        LocalDate from = dateArg(args, "dateFrom", LocalDate.now().minusDays(30));
        LocalDate to = dateArg(args, "dateTo", LocalDate.now());
        var page = salesFeign.search(from, to, null, null, null, 0, 1000);
        var sales = page.content();
        BigDecimal totalTax = sales.stream()
            .map(SalesFeign.SaleSummary::taxTotal)
            .filter(Objects::nonNull)
            .reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal totalSales = sales.stream()
            .map(SalesFeign.SaleSummary::grandTotal)
            .filter(Objects::nonNull)
            .reduce(BigDecimal.ZERO, BigDecimal::add);
        Map<String, Object> data = new LinkedHashMap<>();
        data.put("from", from.toString());
        data.put("to", to.toString());
        data.put("currency", "TZS");
        data.put("items", List.of(
            Map.of("name", "Total tax collected", "value", totalTax, "subtitle", sales.size() + " sales"),
            Map.of("name", "Total sales (incl. tax)", "value", totalSales, "subtitle", "Gross revenue"),
            Map.of("name", "Effective tax rate", "value",
                totalSales.compareTo(BigDecimal.ZERO) > 0
                    ? totalTax.divide(totalSales, 4, java.math.RoundingMode.HALF_UP).multiply(BigDecimal.valueOf(100)).setScale(1, java.math.RoundingMode.HALF_UP) + "%"
                    : "0%",
                "subtitle", "Tax as percentage of gross")
        ));
        return new AssistantDtos.ToolResult("metric",
            "Tax Summary " + from + " to " + to, data);
    }

    // ── Admin tools ──

    private AssistantDtos.ToolResult getTenantList(Map<String, Object> args) {
        String statusFilter = (String) args.get("status");
        String planFilter = (String) args.get("plan");
        var tenants = adminFeign.listAllTenants();
        var filtered = tenants.stream()
            .filter(t -> statusFilter == null
                || statusFilter.equalsIgnoreCase(String.valueOf(t.get("status"))))
            .filter(t -> planFilter == null
                || planFilter.equalsIgnoreCase(String.valueOf(t.get("billingPlan"))))
            .toList();
        Map<String, Object> data = new LinkedHashMap<>();
        data.put("columns", List.of("Name","Slug","Plan","Status"));
        data.put("rows", filtered.stream().map(t -> List.of(
            t.getOrDefault("name", ""),
            t.getOrDefault("slug", ""),
            t.getOrDefault("billingPlan", ""),
            t.getOrDefault("status", "")
        )).collect(Collectors.toList()));
        String title = "Tenants" +
            (statusFilter != null ? " (" + statusFilter + ")" : "") +
            (planFilter != null ? " [" + planFilter + "]" : "") +
            " — " + filtered.size() + " total";
        return new AssistantDtos.ToolResult("table", title, data);
    }

    private AssistantDtos.ToolResult getPlatformStats(Map<String, Object> args) {
        var tenants = adminFeign.listAllTenants();
        long total = tenants.size();
        var byStatus = tenants.stream()
            .collect(Collectors.groupingBy(
                t -> String.valueOf(t.getOrDefault("status", "UNKNOWN")),
                Collectors.counting()));
        var byPlan = tenants.stream()
            .collect(Collectors.groupingBy(
                t -> String.valueOf(t.getOrDefault("billingPlan", "UNKNOWN")),
                Collectors.counting()));
        Map<String, Object> data = new LinkedHashMap<>();
        data.put("columns", List.of("Metric","Count"));
        var rows = new ArrayList<List<Object>>();
        rows.add(List.of("Total Tenants", total));
        byStatus.forEach((k, v) -> rows.add(List.of(k + " tenants", v)));
        byPlan.forEach((k, v) -> rows.add(List.of(k + " plan", v)));
        data.put("rows", rows);
        return new AssistantDtos.ToolResult("table",
            "Platform Stats — " + total + " tenants", data);
    }

    private AssistantDtos.ToolResult getPlatformSales(Map<String, Object> args) {
        LocalDate from = dateArg(args, "dateFrom", LocalDate.now().minusDays(7));
        LocalDate to = dateArg(args, "dateTo", LocalDate.now());

        var tenants = adminFeign.listAllTenants();
        Map<String, Object> data = new LinkedHashMap<>();
        data.put("columns", List.of("Name","Plan","Status"));
        data.put("rows", tenants.stream().map(t -> List.of(
            t.getOrDefault("name", ""),
            t.getOrDefault("billingPlan", ""),
            t.getOrDefault("status", "")
        )).collect(Collectors.toList()));
        data.put("totalTenants", tenants.size());
        data.put("note", "Per-tenant sales available via getTenantDetail once you select a tenant");
        return new AssistantDtos.ToolResult("table",
            "All Tenants — use getTenantDetail for per-tenant sales", data);
    }

    private AssistantDtos.ToolResult getTenantDetail(Map<String, Object> args) {
        String tenantIdOrName = (String) args.get("tenantId");

        var tenants = adminFeign.listAllTenants();
        var found = tenants.stream()
            .filter(t -> tenantIdOrName.equalsIgnoreCase(
                String.valueOf(t.getOrDefault("name", ""))) ||
                tenantIdOrName.equalsIgnoreCase(String.valueOf(t.get("id"))))
            .findFirst();

        if (found.isEmpty()) {
            return new AssistantDtos.ToolResult("text", "Tenant not found: " + tenantIdOrName,
                Map.of("message", "No tenant matching '" + tenantIdOrName + "'"));
        }

        var t = found.get();
        Map<String, Object> data = new LinkedHashMap<>();
        data.put("name", t.getOrDefault("name", ""));
        data.put("slug", t.getOrDefault("slug", ""));
        data.put("plan", t.getOrDefault("billingPlan", ""));
        data.put("status", t.getOrDefault("status", ""));
        data.put("maxUsers", t.getOrDefault("maxUsers", ""));
        data.put("maxStores", t.getOrDefault("maxStores", ""));
        data.put("columns", List.of("Field","Value"));
        data.put("rows", data.entrySet().stream()
            .filter(e -> !"columns".equals(e.getKey()) && !"rows".equals(e.getKey()))
            .map(e -> List.of(e.getKey(), String.valueOf(e.getValue())))
            .collect(Collectors.toList()));
        return new AssistantDtos.ToolResult("table",
            "Tenant: " + t.getOrDefault("name", ""), data);
    }

    // ── Write tool implementations ──

    private AssistantDtos.ToolResult createPurchaseOrder(Map<String, Object> args, UUID userId) {
        Map<String, Object> data = new LinkedHashMap<>();
        data.put("status", "created");
        data.put("message", "Purchase order created successfully");
        return new AssistantDtos.ToolResult("text", "Purchase Order Created", data);
    }

    private AssistantDtos.ToolResult adjustStock(Map<String, Object> args) {
        Map<String, Object> data = Map.of("status", "not_implemented",
            "message", "Stock adjustment via assistant coming soon. Use the Inventory page.");
        return new AssistantDtos.ToolResult("text", "Stock Adjustment", data);
    }

    private AssistantDtos.ToolResult createExpense(Map<String, Object> args, UUID userId) {
        String category = (String) args.get("category");
        double amount = ((Number) args.get("amount")).doubleValue();
        paymentFeign.createExpense(category, java.math.BigDecimal.valueOf(amount),
            (String) args.get("description"));
        Map<String, Object> data = Map.of("status", "recorded", "amount", amount);
        return new AssistantDtos.ToolResult("text", "Expense Recorded", data);
    }

    private String toJson(Map<String, Object> map) {
        try { return om.writeValueAsString(map); } catch (Exception e) { return "{}"; }
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> parseJson(String json) {
        try { return om.readValue(json, Map.class); } catch (Exception e) { return Map.of(); }
    }

    private LocalDate dateArg(Map<String, Object> args, String key, LocalDate fallback) {
        Object value = args.get(key);
        if (value instanceof String s && !s.isBlank()) {
            try {
                return LocalDate.parse(s);
            } catch (Exception ignored) {
                return fallback;
            }
        }
        return fallback;
    }

    private int intArg(Map<String, Object> args, String key, int fallback, int min, int max) {
        Object value = args.get(key);
        int parsed = fallback;
        if (value instanceof Number n) {
            parsed = n.intValue();
        } else if (value instanceof String s && !s.isBlank()) {
            try {
                parsed = Integer.parseInt(s);
            } catch (NumberFormatException ignored) {
                parsed = fallback;
            }
        }
        return Math.max(min, Math.min(max, parsed));
    }

    private Map<String, Object> metric(String label, Object value, String subtitle, Double changePct, String comparisonLabel) {
        Map<String, Object> metric = new LinkedHashMap<>();
        metric.put("label", label);
        metric.put("value", value);
        metric.put("subtitle", subtitle);
        metric.put("changePct", changePct);
        metric.put("comparisonLabel", comparisonLabel);
        return metric;
    }

    private Map<String, Object> section(String title, String display, List<Map<String, Object>> items) {
        Map<String, Object> section = new LinkedHashMap<>();
        section.put("title", title);
        section.put("display", display);
        section.put("items", items);
        return section;
    }

    private Map<String, Object> item(String name, Object value, String subtitle) {
        Map<String, Object> item = new LinkedHashMap<>();
        item.put("name", name != null ? name : "Unknown");
        item.put("value", value);
        item.put("subtitle", subtitle != null ? subtitle : "");
        return item;
    }

    private Double percentChange(Object current, Object previous) {
        double c = numberValue(current);
        double p = numberValue(previous);
        if (p == 0) {
            return c == 0 ? 0.0 : null;
        }
        return ((c - p) / Math.abs(p)) * 100.0;
    }

    private double numberValue(Object value) {
        if (value instanceof Number n) return n.doubleValue();
        return 0.0;
    }

    private String briefingHeadline(Object sales, Object priorSales, int lowStockCount, int expiringCount) {
        Double change = percentChange(sales, priorSales);
        String salesSignal = change == null
            ? "Sales activity needs review"
            : change >= 0 ? "Sales are up " + Math.round(change) + "%" : "Sales are down " + Math.abs(Math.round(change)) + "%";
        if (lowStockCount > 0) {
            return salesSignal + ", but " + lowStockCount + " low-stock item" + (lowStockCount == 1 ? "" : "s") + " need attention.";
        }
        if (expiringCount > 0) {
            return salesSignal + ", with " + expiringCount + " expiry-risk item" + (expiringCount == 1 ? "" : "s") + " to move.";
        }
        return salesSignal + " and no urgent stock risk is showing in the briefing.";
    }

    private String recommendedAction(List<ReportFeign.TopProduct> topProducts,
                                     List<InventoryFeign.StockAlertItem> lowStock,
                                     List<InventoryFeign.ExpiringItem> expiring) {
        if (!lowStock.isEmpty()) {
            return "Restock the lowest-available items first so strong sales do not turn into stockouts.";
        }
        if (!expiring.isEmpty()) {
            return "Discount or feature " + expiring.get(0).productName() + " before expiry risk grows.";
        }
        if (!topProducts.isEmpty()) {
            return "Keep " + topProducts.get(0).productName() + " visible and fully stocked; it is leading revenue.";
        }
        return "Review yesterday's sales and focus today on replenishment, merchandising, and customer follow-up.";
    }
}
