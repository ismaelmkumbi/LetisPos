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
    private final NotificationFeign notificationFeign;
    private final DocumentFeign documentFeign;
    private final AssistantDraftRepository draftRepo;
    private final ObjectMapper om = new ObjectMapper();

    public AssistantToolExecutor(ReportFeign reportFeign, SalesFeign salesFeign,
                                  InventoryFeign inventoryFeign, ProductFeign productFeign,
                                  PaymentFeign paymentFeign, CustomerFeign customerFeign,
                                  AdminFeign adminFeign, NotificationFeign notificationFeign,
                                  DocumentFeign documentFeign, AssistantDraftRepository draftRepo) {
        this.reportFeign = reportFeign;
        this.salesFeign = salesFeign;
        this.inventoryFeign = inventoryFeign;
        this.productFeign = productFeign;
        this.paymentFeign = paymentFeign;
        this.customerFeign = customerFeign;
        this.adminFeign = adminFeign;
        this.notificationFeign = notificationFeign;
        this.documentFeign = documentFeign;
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
            case "searchSales" -> searchSales(args);
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
            case "getLatestProduct" -> getLatestProduct(args);
            case "getLatestProducts" -> getLatestProducts(args);
            case "getInventoryMovements" -> getInventoryMovements(args);
            case "getStockValuation" -> getStockValuation(args);
            case "getDeadStock" -> getDeadStock(args);
            case "getReorderSuggestions" -> getReorderSuggestions(args);
            case "getCustomerProfile" -> getCustomerProfile(args);
            case "getBusinessAnomalies" -> getBusinessAnomalies(args);
            case "getProductTimeline" -> getProductTimeline(args);
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
            case "getNotificationTemplates" -> getNotificationTemplates(args);
            case "generateDocument" -> generateDocument(args);
            case "searchDocuments" -> searchDocuments(args);
            case "teachModule" -> teachModule(args);
            case "askClarification" -> askClarification(args);
            // Write tools — needed here for super admin auto-confirm path
            case "createProduct" -> createProduct(args);
            case "updateProductPrice" -> updateProductPrice(args);
            case "createCustomer" -> createCustomer(args);
            case "updateCustomer" -> updateCustomer(args);
            case "createPurchaseOrder" -> createPurchaseOrder(args, userId);
            case "adjustStock" -> adjustStock(args);
            case "createExpense" -> createExpense(args, userId);
            case "sendEmail" -> sendEmail(args);
            case "sendSMS" -> sendSMS(args);
            case "emailDocument" -> emailDocument(args);
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
            case "createProduct" -> createProduct(args);
            case "updateProductPrice" -> updateProductPrice(args);
            case "createCustomer" -> createCustomer(args);
            case "updateCustomer" -> updateCustomer(args);
            case "createPurchaseOrder" -> createPurchaseOrder(args, userId);
            case "adjustStock" -> adjustStock(args);
            case "createExpense" -> createExpense(args, userId);
            case "generateDocument" -> generateDocument(args);
            case "sendEmail" -> sendEmail(args);
            case "sendSMS" -> sendSMS(args);
            case "emailDocument" -> emailDocument(args);
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
        var expiring = inventoryFeign.expiringSoon(expiryDays).getContent();

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
                .map(i -> item(i.batchNumber(), i.onHand(), "expires " + i.expiryDate()))
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
        UUID warehouseId = args.containsKey("warehouseId") && args.get("warehouseId") != null
            ? UUID.fromString((String) args.get("warehouseId")) : null;
        Map<String, Object> data = new LinkedHashMap<>();
        data.put("columns", List.of("Field","Value"));
        List<List<Object>> rows = new ArrayList<>();
        if (warehouseId != null) {
            var stock = inventoryFeign.stockLevel(productId, warehouseId);
            stock.forEach((k, v) -> rows.add(List.of(k, String.valueOf(v))));
        } else {
            List<UUID> warehouseIds = resolveWarehouseIds();
            if (warehouseIds.isEmpty()) {
                throw new ToolException("NO_WAREHOUSE",
                    "No warehouses are configured for this tenant.",
                    "Ask an admin to create at least one warehouse in Settings → Warehouses, then try again.");
            }
            BigDecimal total = aggregateAvailable(productId, warehouseIds);
            rows.add(List.of("available (all warehouses)", total.stripTrailingZeros().toPlainString()));
            rows.add(List.of("warehouseCount", String.valueOf(warehouseIds.size())));
        }
        data.put("rows", rows);
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

        UUID warehouseId = args.containsKey("warehouseId") && args.get("warehouseId") != null
            ? UUID.fromString((String) args.get("warehouseId")) : null;
        List<UUID> warehouseIds = warehouseId != null
            ? List.of(warehouseId) : resolveWarehouseIds();
        Map<String, Object> data = new LinkedHashMap<>();
        data.put("columns", List.of("Product","SKU","Available"));
        List<List<Object>> rows = new ArrayList<>();
        for (var product : products) {
            BigDecimal available = aggregateAvailable(product.id(), warehouseIds);
            rows.add(List.of(
                product.name(),
                product.sku() != null ? product.sku() : "",
                available.stripTrailingZeros().toPlainString()
            ));
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
        var items = inventoryFeign.expiringSoon(days).getContent();
        Map<String, Object> data = new LinkedHashMap<>();
        data.put("columns", List.of("Batch","Expiry Date","On Hand"));
        data.put("rows", items.stream().map(i -> List.of(
            i.batchNumber(), i.expiryDate().toString(), i.onHand()))
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

    private AssistantDtos.ToolResult searchSales(Map<String, Object> args) {
        String ref = (String) args.get("ref");
        String status = (String) args.get("status");
        int limit = intArg(args, "limit", 10, 1, 25);
        var page = salesFeign.search(null, null, null, null, status, ref, 0, limit);
        var sales = page.content();
        Map<String, Object> data = new LinkedHashMap<>();
        data.put("columns", List.of("ID","Ref","Date","Status","Total"));
        data.put("rows", sales.stream().map(s -> List.of(
            s.id().toString(), s.ref(), s.date().toString(), s.status(),
            s.grandTotal())).collect(Collectors.toList()));
        return new AssistantDtos.ToolResult("table",
            "Sales (" + sales.size() + ")", data);
    }

    private AssistantDtos.ToolResult getRecentSales(Map<String, Object> args) {
        int limit = intArg(args, "limit", 10, 1, 25);
        var page = salesFeign.search(null, null, null, null, null, null, 0, limit);
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
        long totalProducts = page.getTotalElements();
        data.put("totalProducts", totalProducts);
        data.put("displayedProducts", products.size());
        data.put("columns", List.of("Product","SKU","Price","Stock"));

        // Single batched call → inventory-service aggregates across all warehouses
        Map<UUID, Map<String, Object>> aggregates;
        try {
            aggregates = inventoryFeign.batchAggregate(
                products.stream().map(p -> p.id()).toList());
        } catch (Exception e) {
            aggregates = Map.of();
        }

        List<List<Object>> rows = new ArrayList<>();
        for (var product : products) {
            Map<String, Object> agg = aggregates.getOrDefault(product.id(), Map.of());
            Object available = agg.getOrDefault("available", BigDecimal.ZERO);
            rows.add(List.of(
                product.name(),
                product.sku() != null ? product.sku() : "",
                product.price(),
                toBigDecimal(available).stripTrailingZeros().toPlainString()
            ));
        }
        data.put("rows", rows);
        if (aggregates.isEmpty()) {
            data.put("note", "Stock data unavailable — verify at least one warehouse exists in Settings → Warehouses.");
        }
        return new AssistantDtos.ToolResult("table",
            "Stock Overview (" + totalProducts + " products)", data);
    }

    /**
     * Returns the active warehouse IDs for the current tenant, or an empty list
     * if listing fails. Used by stock tools that previously sent {@code null}
     * warehouseId and got rejected by the inventory service.
     */
    private List<UUID> resolveWarehouseIds() {
        try {
            return inventoryFeign.listWarehouses().stream()
                .filter(InventoryFeign.Warehouse::active)
                .map(InventoryFeign.Warehouse::id)
                .toList();
        } catch (Exception e) {
            return List.of();
        }
    }

    /**
     * Aggregate stock level for one product across all active warehouses.
     * Returns a {@code stockLevel}-shaped map (available, onHand, reserved,
     * warehouses), or an empty map when no warehouses are configured or all
     * lookups fail. Existing callers that previously passed {@code null}
     * warehouseId — which the inventory service rejects — should call this
     * helper instead.
     */
    private Map<String, Object> aggregateStockLevel(UUID productId) {
        List<UUID> wids = resolveWarehouseIds();
        if (wids.isEmpty()) return Map.of();
        BigDecimal totalAvailable = BigDecimal.ZERO;
        BigDecimal totalOnHand = BigDecimal.ZERO;
        BigDecimal totalReserved = BigDecimal.ZERO;
        int counted = 0;
        for (UUID wid : wids) {
            try {
                var s = inventoryFeign.stockLevel(productId, wid);
                if (s == null) continue;
                totalAvailable = totalAvailable.add(toBigDecimal(
                    s.getOrDefault("available", s.getOrDefault("quantity", BigDecimal.ZERO))));
                totalOnHand = totalOnHand.add(toBigDecimal(s.getOrDefault("onHand", BigDecimal.ZERO)));
                totalReserved = totalReserved.add(toBigDecimal(s.getOrDefault("reserved", BigDecimal.ZERO)));
                counted++;
            } catch (Exception ignored) {
                // skip — partial aggregation is acceptable
            }
        }
        if (counted == 0) return Map.of();
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("available", totalAvailable);
        out.put("onHand", totalOnHand);
        out.put("reserved", totalReserved);
        out.put("warehouses", counted);
        return out;
    }

    /**
     * Sums the {@code available} (fallback {@code quantity}) stock for a
     * product across every supplied warehouse. Per-warehouse errors are
     * tolerated so one bad warehouse never zeroes the whole row.
     */
    private BigDecimal aggregateAvailable(UUID productId, List<UUID> warehouseIds) {
        BigDecimal total = BigDecimal.ZERO;
        boolean any = false;
        for (UUID wid : warehouseIds) {
            try {
                var stock = inventoryFeign.stockLevel(productId, wid);
                if (stock == null) continue;
                Object v = stock.getOrDefault("available", stock.get("quantity"));
                if (v == null) continue;
                total = total.add(toBigDecimal(v));
                any = true;
            } catch (Exception ignored) {
                // skip this warehouse — partial aggregation is fine
            }
        }
        return any ? total : BigDecimal.ZERO;
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
        // Validate — only valid SaleStatus enum values
        Set<String> validStatuses = Set.of("DRAFT", "CONFIRMED", "CANCELLED", "RETURNED");
        if (status == null || !validStatuses.contains(status.toUpperCase())) {
            return new AssistantDtos.ToolResult("text",
                "Invalid sale status: " + status, Map.of("message", "Valid statuses are DRAFT, CONFIRMED, CANCELLED, RETURNED. Sales do not use PENDING — use CONFIRMED for completed orders or DRAFT for unsubmitted ones."));
        }
        LocalDate from = dateArg(args, "dateFrom", LocalDate.now().minusDays(30));
        LocalDate to = dateArg(args, "dateTo", LocalDate.now());
        int limit = intArg(args, "limit", 25, 1, 50);
        var page = salesFeign.search(from, to, null, null, status.toUpperCase(), null, 0, limit);
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
        try { stock = aggregateStockLevel(product.id()); } catch (Exception ignored) {}
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
                var stock = aggregateStockLevel(product.id());
                stockStr = String.valueOf(stock.getOrDefault("available", stock.getOrDefault("quantity", "?")));
            } catch (Exception ignored) {}
            rows.add(List.of(product.name(), product.sku() != null ? product.sku() : "", product.price(), stockStr));
        }
        data.put("rows", rows);
        data.put("totalShown", products.size());
        return new AssistantDtos.ToolResult("table",
            "Product Inventory (" + products.size() + " items)", data);
    }

    private AssistantDtos.ToolResult getLatestProduct(Map<String, Object> args) {
        var pageable = org.springframework.data.domain.PageRequest.of(0, 1,
            org.springframework.data.domain.Sort.by(org.springframework.data.domain.Sort.Direction.DESC, "createdAt"));
        var page = productFeign.search(null, null, null, null, pageable);
        var products = page.getContent();
        if (products.isEmpty()) {
            return new AssistantDtos.ToolResult("text", "Latest Product",
                Map.of("message", "No products found in your catalog yet."));
        }

        var product = products.get(0);
        Map<String, Object> stock = Map.of();
        String stockStatus = "Inventory data unavailable";
        try {
            stock = aggregateStockLevel(product.id());
            stockStatus = String.valueOf(stock.getOrDefault("available",
                stock.getOrDefault("quantity", stock.getOrDefault("onHand", "Unknown"))));
        } catch (Exception ignored) {
            // Product freshness should still answer even if inventory is temporarily unreachable.
        }

        Map<String, Object> data = new LinkedHashMap<>();
        data.put("columns", List.of("Field", "Value"));
        Map<String, Object> details = new LinkedHashMap<>();
        details.put("Name", product.name());
        details.put("SKU", product.sku() != null ? product.sku() : "N/A");
        details.put("Price", product.price() != null ? product.price() : "N/A");
        details.put("Cost", product.cost() != null ? product.cost() : "N/A");
        details.put("Status", Boolean.TRUE.equals(product.status()) ? "Active" : "Inactive");
        details.put("Added At", product.createdAt() != null ? product.createdAt().toString() : "Unknown");
        details.put("Available Stock", stockStatus);
        stock.forEach((key, value) -> details.putIfAbsent("Stock " + key, value));
        data.put("rows", details.entrySet().stream()
            .map(e -> List.of(e.getKey(), String.valueOf(e.getValue())))
            .collect(Collectors.toList()));
        data.put("productId", product.id().toString());
        return new AssistantDtos.ToolResult("table",
            "Latest Product Added: " + product.name(), data);
    }

    private AssistantDtos.ToolResult getLatestProducts(Map<String, Object> args) {
        int limit = intArg(args, "limit", 10, 1, 50);
        int daysBack = intArg(args, "daysBack", 30, 1, 365);
        var pageable = org.springframework.data.domain.PageRequest.of(0, limit,
            org.springframework.data.domain.Sort.by(org.springframework.data.domain.Sort.Direction.DESC, "createdAt"));
        var page = productFeign.search(null, null, null, true, pageable);
        var products = page.getContent();
        Instant cutoff = Instant.now().minus(daysBack, ChronoUnit.DAYS);

        var recent = products.stream()
            .filter(p -> p.createdAt() != null && p.createdAt().isAfter(cutoff))
            .toList();

        Map<String, Object> data = new LinkedHashMap<>();
        data.put("columns", List.of("Name","SKU","Price","Status","Added","Stock"));
        List<List<Object>> rows = new ArrayList<>();
        for (var product : recent) {
            String stockStr = "?";
            try {
                var stock = aggregateStockLevel(product.id());
                stockStr = String.valueOf(stock.getOrDefault("available",
                    stock.getOrDefault("quantity", "?")));
            } catch (Exception ignored) {}
            rows.add(List.of(
                product.name(),
                product.sku() != null ? product.sku() : "",
                product.price(),
                Boolean.TRUE.equals(product.status()) ? "Active" : "Inactive",
                product.createdAt() != null ? product.createdAt().toString() : "?",
                stockStr
            ));
        }
        data.put("rows", rows);
        data.put("totalRecent", recent.size());
        data.put("lookbackDays", daysBack);
        return new AssistantDtos.ToolResult("table",
            "Recently Added Products (" + recent.size() + " in last " + daysBack + " days)", data);
    }

    private AssistantDtos.ToolResult getInventoryMovements(Map<String, Object> args) {
        LocalDate from = dateArg(args, "dateFrom", LocalDate.now().minusDays(14));
        LocalDate to = dateArg(args, "dateTo", LocalDate.now());
        int limit = intArg(args, "limit", 20, 1, 50);
        UUID warehouseId = args.containsKey("warehouseId")
            ? UUID.fromString((String) args.get("warehouseId")) : null;

        var page = inventoryFeign.listAdjustments(warehouseId, from, to,
            org.springframework.data.domain.Pageable.ofSize(limit));
        var adjustments = page.getContent();

        // If productName filter provided, resolve to product IDs and filter
        String productName = args.containsKey("productName")
            ? String.valueOf(args.get("productName")).trim() : null;
        Set<UUID> matchingProductIds = Set.of();
        if (productName != null && !productName.isBlank()) {
            var prodPage = productFeign.search(productName, null, null, null,
                org.springframework.data.domain.Pageable.ofSize(10));
            matchingProductIds = prodPage.getContent().stream()
                .map(ProductFeign.ProductDto::id)
                .collect(Collectors.toSet());
        }

        Map<String, Object> data = new LinkedHashMap<>();
        data.put("columns", List.of("Date","Ref","Product","Qty Change","Reason","Warehouse"));
        List<List<Object>> rows = new ArrayList<>();
        for (var adj : adjustments) {
            Object adjId = adj.get("id");
            Object adjRef = adj.getOrDefault("ref", "");
            Object adjDate = adj.getOrDefault("date", "");
            Object adjReason = adj.getOrDefault("reason", "");
            Object adjWarehouse = adj.getOrDefault("warehouseId", "");
            Object lines = adj.get("lines");

            if (lines instanceof List<?> lineList) {
                for (Object line : lineList) {
                    if (line instanceof Map<?,?> lm) {
                        Object lineProductId = lm.get("productId");
                        if (!matchingProductIds.isEmpty() && lineProductId != null
                            && !matchingProductIds.contains(UUID.fromString(lineProductId.toString()))) {
                            continue;
                        }
                        Object qtyDelta = lm.get("qtyDelta");
                        rows.add(List.<Object>of(
                            adjDate, adjRef,
                            lineProductId != null ? lineProductId.toString() : "?",
                            qtyDelta != null ? qtyDelta : "",
                            adjReason, adjWarehouse
                        ));
                    }
                }
            } else {
                rows.add(List.of(adjDate, adjRef, adjId, "?", adjReason, adjWarehouse));
            }
        }
        data.put("rows", rows);
        data.put("totalMovements", adjustments.size());
        String title = "Inventory Movements " + from + " to " + to
            + (productName != null ? " for " + productName : "");
        return new AssistantDtos.ToolResult("table", title, data);
    }

    private AssistantDtos.ToolResult getStockValuation(Map<String, Object> args) {
        UUID warehouseId = args.containsKey("warehouseId")
            ? UUID.fromString((String) args.get("warehouseId")) : null;

        var page = productFeign.search(null, null, null, true,
            org.springframework.data.domain.Pageable.ofSize(200));
        var products = page.getContent();

        BigDecimal totalCost = BigDecimal.ZERO;
        BigDecimal totalSelling = BigDecimal.ZERO;
        BigDecimal totalQty = BigDecimal.ZERO;
        int productsWithStock = 0;
        int productsWithCost = 0;

        for (var product : products) {
            try {
                var stock = inventoryFeign.stockLevel(product.id(), warehouseId);
                Object qtyObj = stock.getOrDefault("available",
                    stock.getOrDefault("quantity", stock.getOrDefault("onHand", BigDecimal.ZERO)));
                BigDecimal qty = toBigDecimal(qtyObj);
                if (qty.compareTo(BigDecimal.ZERO) <= 0) continue;

                productsWithStock++;
                BigDecimal cost = product.cost() != null ? product.cost() : BigDecimal.ZERO;
                BigDecimal price = product.price() != null ? product.price() : BigDecimal.ZERO;

                if (cost.compareTo(BigDecimal.ZERO) > 0) {
                    productsWithCost++;
                    totalCost = totalCost.add(cost.multiply(qty));
                }
                totalSelling = totalSelling.add(price.multiply(qty));
                totalQty = totalQty.add(qty);
            } catch (Exception ignored) {}
        }

        BigDecimal estimatedMargin = totalSelling.subtract(totalCost);
        double marginPct = totalSelling.compareTo(BigDecimal.ZERO) > 0
            ? totalCost.compareTo(BigDecimal.ZERO) > 0
                ? estimatedMargin.divide(totalSelling, 4, java.math.RoundingMode.HALF_UP)
                    .multiply(BigDecimal.valueOf(100)).doubleValue()
                : 100.0
            : 0.0;

        Map<String, Object> data = new LinkedHashMap<>();
        data.put("currency", "TZS");
        data.put("items", List.of(
            Map.of("name", "Total cost value (at purchase)", "value", totalCost,
                "subtitle", productsWithCost + " products with cost data"),
            Map.of("name", "Total selling value (at retail)", "value", totalSelling,
                "subtitle", productsWithStock + " products with stock"),
            Map.of("name", "Estimated gross margin", "value", estimatedMargin,
                "subtitle", String.format("%.1f%%", marginPct)),
            Map.of("name", "Total quantity on hand", "value", totalQty,
                "subtitle", "Across " + productsWithStock + " products")
        ));
        return new AssistantDtos.ToolResult("metric",
            "Stock Valuation" + (warehouseId != null ? " for warehouse " + warehouseId : ""), data);
    }

    private AssistantDtos.ToolResult getDeadStock(Map<String, Object> args) {
        int daysWithoutSales = intArg(args, "daysWithoutSales", 30, 7, 180);
        BigDecimal minStockQty = args.containsKey("minStockQty")
            ? BigDecimal.valueOf(((Number) args.get("minStockQty")).doubleValue())
            : BigDecimal.ONE;
        int limit = intArg(args, "limit", 20, 1, 50);

        LocalDate from = LocalDate.now().minusDays(daysWithoutSales);
        LocalDate to = LocalDate.now();

        // Get all products with stock
        var productPage = productFeign.search(null, null, null, true,
            org.springframework.data.domain.Pageable.ofSize(200));
        var products = productPage.getContent();

        // Get sales for the period — products that DID sell
        var salesPage = salesFeign.search(from, to, null, null, "CONFIRMED", null, 0, 1000);
        Set<UUID> productsWithSales = new HashSet<>();
        for (var sale : salesPage.content()) {
            if (sale.lines() != null) {
                for (var line : sale.lines()) {
                    if (line.productId() != null) productsWithSales.add(line.productId());
                }
            }
        }

        record DeadProduct(String name, String sku, BigDecimal price, BigDecimal stockQty,
                          String status, Instant createdAt) {}
        List<DeadProduct> deadProducts = new ArrayList<>();

        for (var product : products) {
            if (productsWithSales.contains(product.id())) continue;
            try {
                var stock = aggregateStockLevel(product.id());
                Object qtyObj = stock.getOrDefault("available",
                    stock.getOrDefault("quantity", stock.getOrDefault("onHand", BigDecimal.ZERO)));
                BigDecimal qty = toBigDecimal(qtyObj);
                if (qty.compareTo(minStockQty) < 0) continue;
                deadProducts.add(new DeadProduct(
                    product.name(),
                    product.sku() != null ? product.sku() : "",
                    product.price(),
                    qty,
                    Boolean.TRUE.equals(product.status()) ? "Active" : "Inactive",
                    product.createdAt()
                ));
            } catch (Exception ignored) {}
        }

        deadProducts.sort((a, b) -> b.stockQty.compareTo(a.stockQty));
        var topDead = deadProducts.stream().limit(limit).toList();

        Map<String, Object> data = new LinkedHashMap<>();
        data.put("columns", List.of("Product","SKU","Price","Stock Qty","Status","Added"));
        data.put("rows", topDead.stream().map(dp -> List.of(
            dp.name, dp.sku, dp.price, dp.stockQty, dp.status,
            dp.createdAt != null ? dp.createdAt.toString() : "?"
        )).collect(Collectors.toList()));
        data.put("totalDead", deadProducts.size());
        data.put("daysWithoutSales", daysWithoutSales);
        data.put("recommendation", deadProducts.isEmpty()
            ? "All stocked products have recent sales activity. No dead stock detected."
            : deadProducts.size() + " products have stock but no sales in " + daysWithoutSales
                + " days. Consider discounting or bundling the top items.");
        return new AssistantDtos.ToolResult("table",
            "Dead Stock — " + deadProducts.size() + " items with no sales in " + daysWithoutSales + " days", data);
    }

    private AssistantDtos.ToolResult getReorderSuggestions(Map<String, Object> args) {
        try {
            var suggestions = inventoryFeign.reorderSuggestions();
            Map<String, Object> data = new LinkedHashMap<>();
            data.put("columns", List.of("Product","Current Stock","Suggested Qty","Min Qty","Urgency","Daily Velocity","Supplier"));
            data.put("rows", suggestions.stream().map(s -> List.of(
                s.getOrDefault("productName", "?"),
                s.getOrDefault("currentStock", 0),
                s.getOrDefault("suggestedQty", 0),
                s.getOrDefault("minQty", 0),
                s.getOrDefault("urgency", "?"),
                s.getOrDefault("dailyVelocity", 0),
                s.getOrDefault("supplierId", "N/A")
            )).collect(Collectors.toList()));
            data.put("totalSuggestions", suggestions.size());
            data.put("currency", "TZS");
            return new AssistantDtos.ToolResult("table",
                "Reorder Suggestions (" + suggestions.size() + " items)", data);
        } catch (Exception e) {
            return new AssistantDtos.ToolResult("text", "Reorder Suggestions Unavailable",
                Map.of("message", "The reorder suggestion service is temporarily unavailable. "
                    + "You can use getLowStock to see products below reorder threshold, "
                    + "and getTopProducts to see what is selling well."));
        }
    }

    private AssistantDtos.ToolResult getCustomerProfile(Map<String, Object> args) {
        String customerName = String.valueOf(args.getOrDefault("customerName", "")).trim();
        if (customerName.isBlank()) {
            throw new IllegalArgumentException("customerName is required to look up a customer profile.");
        }

        // Search for customer by name
        var custPage = customerFeign.searchCustomers(customerName, true,
            org.springframework.data.domain.Pageable.ofSize(5));
        var customers = custPage.getContent();
        if (customers.isEmpty()) {
            return new AssistantDtos.ToolResult("text", "Customer Not Found",
                Map.of("message", "No customer matching '" + customerName + "' found."));
        }

        var customer = customers.get(0);
        Object custId = customer.get("id");
        String name = String.valueOf(customer.getOrDefault("name", "?"));
        UUID customerId = custId instanceof String s ? UUID.fromString(s) : null;
        if (customerId == null && custId != null) {
            customerId = UUID.fromString(custId.toString());
        }

        // Get sales summary for this customer
        LocalDate thirtyDaysAgo = LocalDate.now().minusDays(30);
        LocalDate today = LocalDate.now();
        Map<String, Object> data = new LinkedHashMap<>();
        data.put("name", name);
        data.put("phone", customer.getOrDefault("phone", "N/A"));
        data.put("email", customer.getOrDefault("email", "N/A"));
        data.put("address", customer.getOrDefault("address", "N/A"));
        data.put("creditLimit", customer.getOrDefault("creditLimit", "N/A"));
        data.put("active", customer.getOrDefault("active", true));
        data.put("customerSince", customer.getOrDefault("createdAt", "Unknown"));

        // Sales data
        try {
            if (customerId != null) {
                var summary = reportFeign.salesSummary(thirtyDaysAgo.toString(), today.toString(),
                    null, customerId);
                data.put("totalSpend30d", summary.gross());
                data.put("transactionCount30d", summary.salesCount());
                data.put("currency", "TZS");
            }
        } catch (Exception e) {
            data.put("totalSpend30d", "Unavailable");
            data.put("transactionCount30d", "Unavailable");
        }

        data.put("columns", List.of("Field","Value"));
        data.put("rows", data.entrySet().stream()
            .filter(e -> !"columns".equals(e.getKey()) && !"rows".equals(e.getKey()))
            .map(e -> List.of(e.getKey(), String.valueOf(e.getValue())))
            .collect(Collectors.toList()));
        return new AssistantDtos.ToolResult("table",
            "Customer Profile: " + name, data);
    }

    private AssistantDtos.ToolResult getBusinessAnomalies(Map<String, Object> args) {
        LocalDate from = dateArg(args, "dateFrom", LocalDate.now().minusDays(7));
        LocalDate to = dateArg(args, "dateTo", LocalDate.now());
        List<Map<String, Object>> anomalies = new ArrayList<>();

        // Check for cancelled/returned sales
        try {
            var cancelledPage = salesFeign.search(from, to, null, null, "CANCELLED", null, 0, 50);
            long cancelled = cancelledPage.totalElements();
            if (cancelled > 0) {
                anomalies.add(Map.of("type", "warning", "title", "Cancelled transactions",
                    "detail", cancelled + " cancelled sales in period", "severity", cancelled > 10 ? "HIGH" : "LOW"));
            }

            var returnedPage = salesFeign.search(from, to, null, null, "RETURNED", null, 0, 50);
            long returned = returnedPage.totalElements();
            if (returned > 0) {
                anomalies.add(Map.of("type", "warning", "title", "Returns/refunds",
                    "detail", returned + " returned transactions", "severity", returned > 5 ? "MEDIUM" : "LOW"));
            }
        } catch (Exception ignored) {}

        // Check for negative or zero stock
        try {
            var lowStockPage = inventoryFeign.lowStockAlerts(null,
                org.springframework.data.domain.Pageable.ofSize(50));
            long criticalStockouts = lowStockPage.getContent().stream()
                .filter(i -> i.available() != null && i.available().compareTo(BigDecimal.ZERO) <= 0)
                .count();
            if (criticalStockouts > 0) {
                anomalies.add(Map.of("type", "critical", "title", "Stockouts",
                    "detail", criticalStockouts + " products with zero stock", "severity", "HIGH"));
            }
            if (lowStockPage.getTotalElements() > 0) {
                anomalies.add(Map.of("type", "warning", "title", "Low stock items",
                    "detail", lowStockPage.getTotalElements() + " products below reorder threshold",
                    "severity", lowStockPage.getTotalElements() > 20 ? "HIGH" : "MEDIUM"));
            }
        } catch (Exception ignored) {}

        // Check for unusually high discounts
        try {
            var salesPage = salesFeign.search(from, to, null, null, "CONFIRMED", null, 0, 500);
            long highDiscountSales = salesPage.content().stream()
                .filter(s -> s.discountTotal() != null
                    && s.grandTotal() != null
                    && s.grandTotal().compareTo(BigDecimal.ZERO) > 0
                    && s.discountTotal().divide(s.grandTotal(), 4, java.math.RoundingMode.HALF_UP)
                        .compareTo(new BigDecimal("0.20")) > 0)
                .count();
            if (highDiscountSales > 3) {
                anomalies.add(Map.of("type", "warning", "title", "High discounts",
                    "detail", highDiscountSales + " sales with >20% discount", "severity", "MEDIUM"));
            }
        } catch (Exception ignored) {}

        // Check expiring stock
        try {
            var expiring = inventoryFeign.expiringSoon(14).getContent();
            if (!expiring.isEmpty()) {
                anomalies.add(Map.of("type", "warning", "title", "Expiring stock",
                    "detail", expiring.size() + " products expiring within 14 days", "severity", "MEDIUM"));
            }
        } catch (Exception ignored) {}

        Map<String, Object> data = new LinkedHashMap<>();
        data.put("from", from.toString());
        data.put("to", to.toString());
        data.put("anomalyCount", anomalies.size());
        if (anomalies.isEmpty()) {
            data.put("headline", "No anomalies detected in this period. Business operations look normal.");
        } else {
            long critical = anomalies.stream().filter(a -> "HIGH".equals(a.get("severity"))).count();
            data.put("headline", anomalies.size() + " anomalies found (" + critical + " critical). Review the items below.");
        }
        data.put("columns", List.of("Type","Title","Detail","Severity"));
        data.put("rows", anomalies.stream()
            .map(a -> List.of(a.get("type"), a.get("title"), a.get("detail"), a.get("severity")))
            .collect(Collectors.toList()));
        return new AssistantDtos.ToolResult("table",
            "Business Anomalies " + from + " to " + to, data);
    }

    private AssistantDtos.ToolResult getProductTimeline(Map<String, Object> args) {
        String query = String.valueOf(args.getOrDefault("query", "")).trim();
        if (query.isBlank()) {
            throw new IllegalArgumentException("A product name, SKU, or barcode is required.");
        }

        var page = productFeign.search(query, null, null, null,
            org.springframework.data.domain.Pageable.ofSize(3));
        var products = page.getContent();
        if (products.isEmpty()) {
            return new AssistantDtos.ToolResult("text", "Product Not Found",
                Map.of("message", "No product matching '" + query + "'."));
        }

        var product = products.get(0);
        List<Map<String, Object>> events = new ArrayList<>();

        // 1. Product creation
        events.add(Map.of("date", product.createdAt() != null ? product.createdAt().toString() : "Unknown",
            "event", "Product created",
            "detail", product.name() + " added to catalog"));

        // 2. Price history
        try {
            var priceHistory = productFeign.priceHistory(product.id(),
                org.springframework.data.domain.Pageable.ofSize(10));
            for (var ph : priceHistory.getContent()) {
                events.add(Map.of("date", ph.getOrDefault("changedAt", ph.getOrDefault("createdAt", "?")),
                    "event", "Price changed",
                    "detail", "Old: " + ph.getOrDefault("oldPrice", "?")
                        + " -> New: " + ph.getOrDefault("newPrice", "?")));
            }
        } catch (Exception ignored) {}

        // 3. Recent stock movements
        try {
            var adjustments = inventoryFeign.listAdjustments(null,
                LocalDate.now().minusDays(90), LocalDate.now(),
                org.springframework.data.domain.Pageable.ofSize(20));
            for (var adj : adjustments.getContent()) {
                Object lines = adj.get("lines");
                if (lines instanceof List<?> lineList) {
                    for (Object line : lineList) {
                        if (line instanceof Map<?,?> lm
                            && product.id().toString().equals(String.valueOf(lm.get("productId")))) {
                            Object qtyD = lm.get("qtyDelta");
                            Object reasonObj = adj.get("reason");
                            Object dateObj = adj.get("date");
                            events.add(Map.of("date", dateObj != null ? String.valueOf(dateObj) : "?",
                                "event", "Stock adjustment",
                                "detail", "Qty change: " + (qtyD != null ? qtyD : "?")
                                    + " — " + (reasonObj != null ? reasonObj : "")));
                        }
                    }
                }
            }
        } catch (Exception ignored) {}

        // 4. Recent sales activity
        try {
            var salesPage = salesFeign.search(LocalDate.now().minusDays(30), LocalDate.now(),
                null, null, "CONFIRMED", null, 0, 100);
            for (var sale : salesPage.content()) {
                if (sale.lines() != null) {
                    for (var line : sale.lines()) {
                        if (product.id().equals(line.productId())) {
                            events.add(Map.of("date", sale.date().toString(),
                                "event", "Sold",
                                "detail", line.qty() + " units in " + sale.ref()
                                    + " at TZS " + line.unitPrice()));
                        }
                    }
                }
            }
        } catch (Exception ignored) {}

        // Sort events by date, most recent first (strings compare OK for ISO dates)
        events.sort((a, b) -> String.valueOf(b.getOrDefault("date", ""))
            .compareTo(String.valueOf(a.getOrDefault("date", ""))));

        Map<String, Object> data = new LinkedHashMap<>();
        data.put("productName", product.name());
        data.put("productSku", product.sku() != null ? product.sku() : "N/A");
        data.put("currentPrice", product.price());
        data.put("currentCost", product.cost() != null ? product.cost() : "N/A");
        data.put("columns", List.of("Date","Event","Detail"));
        data.put("rows", events.stream().limit(25)
            .map(e -> List.of(e.get("date"), e.get("event"), e.get("detail")))
            .collect(Collectors.toList()));
        data.put("totalEvents", events.size());
        return new AssistantDtos.ToolResult("table",
            "Product Timeline: " + product.name(), data);
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
        var expiring = inventoryFeign.expiringSoon(14).getContent();
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
                .map(i -> item(i.batchNumber(), i.onHand(), "expires " + i.expiryDate()))
                .collect(Collectors.toList()))
        ));
        return new AssistantDtos.ToolResult("briefing", "Daily Snapshot — " + today, data);
    }

    private AssistantDtos.ToolResult getExpenseSummary(Map<String, Object> args) {
        LocalDate from = dateArg(args, "dateFrom", LocalDate.now().minusDays(30));
        LocalDate to = dateArg(args, "dateTo", LocalDate.now());
        java.util.List<Map<String, Object>> expenses = paymentFeign.listExpenses(from.toString(), to.toString());
        Map<String, Object> data = new LinkedHashMap<>();
        data.put("from", from.toString());
        data.put("to", to.toString());
        data.put("count", expenses.size());
        data.put("columns", List.of("Category","Amount","Description"));
        data.put("rows", expenses.stream().map(e -> List.of(
            e.getOrDefault("category", ""),
            e.getOrDefault("amount", ""),
            e.getOrDefault("description", "")
        )).collect(Collectors.toList()));
        return new AssistantDtos.ToolResult("table",
            "Expenses " + from + " to " + to + " (" + expenses.size() + ")", data);
    }

    private AssistantDtos.ToolResult getSalesByPaymentMethod(Map<String, Object> args) {
        LocalDate from = dateArg(args, "dateFrom", LocalDate.now().minusDays(30));
        LocalDate to = dateArg(args, "dateTo", LocalDate.now());
        var page = salesFeign.search(from, to, null, null, null, null, 0, 1000);
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
        var page = salesFeign.search(from, to, null, null, null, null, 0, 1000);
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
        var page = salesFeign.search(from, to, null, null, null, null, 0, 1000);
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
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("productId", args.get("productId"));
        body.put("warehouseId", args.get("warehouseId"));
        body.put("quantity", args.get("quantity"));
        body.put("reason", args.get("reason"));
        Map<String, Object> result = inventoryFeign.adjustStock(body);
        Map<String, Object> data = new LinkedHashMap<>();
        data.put("status", "adjusted");
        data.put("message", "Stock adjusted successfully");
        data.put("result", result);
        return new AssistantDtos.ToolResult("text", "Stock Adjustment", data);
    }

    private AssistantDtos.ToolResult createProduct(Map<String, Object> args) {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("name", args.get("name"));
        body.put("price", args.get("price"));
        body.put("cost", args.get("cost"));
        if (args.containsKey("sku")) body.put("sku", args.get("sku"));
        if (args.containsKey("categoryId")) body.put("categoryId", args.get("categoryId"));
        if (args.containsKey("brandId")) body.put("brandId", args.get("brandId"));
        Map<String, Object> result = productFeign.createProduct(body);
        Map<String, Object> data = new LinkedHashMap<>();
        data.put("status", "created");
        data.put("product", result);
        return new AssistantDtos.ToolResult("text", "Product Created", data);
    }

    private AssistantDtos.ToolResult updateProductPrice(Map<String, Object> args) {
        // Resolve productId from name if needed
        String productIdStr = (String) args.get("productId");
        if ((productIdStr == null || productIdStr.isBlank()) && args.containsKey("productName")) {
            var page = productFeign.search((String) args.get("productName"), null, null, true,
                org.springframework.data.domain.Pageable.ofSize(1));
            if (!page.getContent().isEmpty()) {
                productIdStr = page.getContent().get(0).id().toString();
            }
        }
        if (productIdStr == null || productIdStr.isBlank()) {
            return new AssistantDtos.ToolResult("text", "Product Not Found",
                Map.of("message", "Could not find the product. Please provide a productId or exact product name."));
        }
        UUID productId = UUID.fromString(productIdStr);
        Map<String, Object> body = new LinkedHashMap<>();
        if (args.containsKey("price")) body.put("price", args.get("price"));
        if (args.containsKey("cost")) body.put("cost", args.get("cost"));
        Map<String, Object> result = productFeign.updateProduct(productId, body);
        Map<String, Object> data = new LinkedHashMap<>();
        data.put("status", "updated");
        data.put("product", result);
        return new AssistantDtos.ToolResult("text", "Price Updated", data);
    }

    private AssistantDtos.ToolResult createCustomer(Map<String, Object> args) {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("name", args.get("name"));
        if (args.containsKey("phone")) body.put("phone", args.get("phone"));
        if (args.containsKey("email")) body.put("email", args.get("email"));
        if (args.containsKey("address")) body.put("address", args.get("address"));
        Map<String, Object> result = customerFeign.createCustomer(body);
        Map<String, Object> data = new LinkedHashMap<>();
        data.put("status", "created");
        data.put("customer", result);
        return new AssistantDtos.ToolResult("text", "Customer Created", data);
    }

    private AssistantDtos.ToolResult updateCustomer(Map<String, Object> args) {
        UUID customerId = UUID.fromString((String) args.get("customerId"));
        Map<String, Object> body = new LinkedHashMap<>();
        if (args.containsKey("name")) body.put("name", args.get("name"));
        if (args.containsKey("phone")) body.put("phone", args.get("phone"));
        if (args.containsKey("email")) body.put("email", args.get("email"));
        if (args.containsKey("address")) body.put("address", args.get("address"));
        Map<String, Object> result = customerFeign.updateCustomer(customerId, body);
        Map<String, Object> data = new LinkedHashMap<>();
        data.put("status", "updated");
        data.put("customer", result);
        return new AssistantDtos.ToolResult("text", "Customer Updated", data);
    }

    private AssistantDtos.ToolResult createExpense(Map<String, Object> args, UUID userId) {
        String category = (String) args.get("category");
        double amount = ((Number) args.get("amount")).doubleValue();
        paymentFeign.createExpense(category, java.math.BigDecimal.valueOf(amount),
            (String) args.get("description"));
        Map<String, Object> data = Map.of("status", "recorded", "amount", amount);
        return new AssistantDtos.ToolResult("text", "Expense Recorded", data);
    }

    // ── Notification & Document tools ──

    private AssistantDtos.ToolResult getNotificationTemplates(Map<String, Object> args) {
        String channel = (String) args.get("channel");
        var templates = notificationFeign.listTemplates(null, channel);
        Map<String, Object> data = new LinkedHashMap<>();
        data.put("columns", List.of("Code","Name","Channel","Subject"));
        data.put("rows", templates.stream().map(t -> List.of(
            t.getOrDefault("code", ""),
            t.getOrDefault("name", ""),
            t.getOrDefault("channel", ""),
            t.getOrDefault("subject", "")
        )).collect(Collectors.toList()));
        String title = "Templates" + (channel != null ? " (" + channel + ")" : "") + " — " + templates.size();
        return new AssistantDtos.ToolResult("table", title, data);
    }

    private AssistantDtos.ToolResult generateDocument(Map<String, Object> args) {
        String refId = (String) args.get("referenceId");
        // If referenceId is not a UUID, treat it as a sale reference and resolve it
        if (refId != null && !refId.matches("[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}")) {
            var salePage = salesFeign.search(null, null, null, null, null, refId, 0, 1);
            if (salePage.content().isEmpty()) {
                throw new IllegalArgumentException("Sale not found: " + refId);
            }
            refId = salePage.content().get(0).id().toString();
        }
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("documentType", args.getOrDefault("documentType", "tax-invoice"));
        body.put("referenceType", args.getOrDefault("referenceType", "sale"));
        body.put("referenceId", refId);
        if (args.containsKey("contextData")) body.put("contextData", args.get("contextData"));
        var result = documentFeign.generateDocument(body);
        Map<String, Object> data = new LinkedHashMap<>();
        data.put("status", "generated");
        data.put("documentId", result.get("id"));
        data.put("documentNumber", result.get("documentNumber"));
        data.put("documentType", result.get("documentType"));
        return new AssistantDtos.ToolResult("text", "Document Generated", data);
    }

    private AssistantDtos.ToolResult searchDocuments(Map<String, Object> args) {
        String documentType = (String) args.get("documentType");
        String status = (String) args.get("status");
        String q = (String) args.get("q");
        int page = args.containsKey("page") ? ((Number) args.get("page")).intValue() : 0;
        int size = args.containsKey("size") ? ((Number) args.get("size")).intValue() : 25;
        var result = (q != null && !q.isBlank())
            ? documentFeign.searchByRef(q, documentType, status, page, size)
            : documentFeign.search(documentType, status, page, size);
        Map<String, Object> data = new LinkedHashMap<>();
        // Handle paginated response — content might be in "content" key or at top level
        Object contentObj = result.getOrDefault("content", result.get("data"));
        if (contentObj instanceof List<?> docs) {
            data.put("columns", List.of("ID","Type","Ref","Date","Status"));
            data.put("rows", docs.stream().map(d -> {
                if (d instanceof Map<?,?> m) {
                    Object id = m.get("id");
                    Object type = m.get("documentType");
                    Object ref = m.get("reference");
                    Object createdAt = m.get("createdAt");
                    Object docStatus = m.get("status");
                    return List.of(
                        id != null ? id.toString() : "",
                        type != null ? type.toString() : "",
                        ref != null ? ref.toString() : "",
                        createdAt != null ? createdAt.toString() : "",
                        docStatus != null ? docStatus.toString() : "");
                }
                return List.of(d.toString());
            }).collect(Collectors.toList()));
            data.put("totalResults", result.getOrDefault("totalElements", docs.size()));
        }
        return new AssistantDtos.ToolResult("table",
            "Documents" + (documentType != null ? " (" + documentType + ")" : ""), data);
    }

    @SuppressWarnings("unchecked")
    private AssistantDtos.ToolResult askClarification(Map<String, Object> args) {
        String question = (String) args.get("question");
        if (question == null || question.isBlank()) {
            throw new ToolException("INVALID_ARG",
                "Clarification needs a question.",
                "Provide a 'question' argument with the specific thing you want the user to answer.");
        }
        List<String> options = args.get("options") instanceof List<?> l
            ? l.stream().map(String::valueOf).toList() : List.of();
        Map<String, Object> data = new LinkedHashMap<>();
        data.put("question", question);
        data.put("options", options);
        if (args.get("reason") instanceof String r && !r.isBlank()) data.put("reason", r);
        return new AssistantDtos.ToolResult("clarification", "Need more info", data);
    }

    private AssistantDtos.ToolResult teachModule(Map<String, Object> args) {
        String module = (String) args.get("module");
        String topic = (String) args.get("topic");
        if (module == null || module.isBlank()) {
            throw new ToolException("INVALID_ARG",
                "Which module should I teach you?",
                "Available modules: " + String.join(", ", ModuleGuide.listModules()));
        }
        ModuleGuide.Guide guide = ModuleGuide.lookup(module);
        if (guide == null) {
            throw new ToolException("NOT_FOUND",
                "I don't have a guide for module '" + module + "'.",
                "Try one of: " + String.join(", ", ModuleGuide.listModules()));
        }
        String lang = (String) args.get("lang");
        guide = ModuleGuide.localise(guide, lang);
        Map<String, Object> data = new LinkedHashMap<>();
        data.put("module", guide.module());
        data.put("title", guide.title());
        data.put("summary", guide.summary());
        data.put("steps", guide.steps());
        data.put("rolesAllowed", guide.rolesAllowed());
        data.put("tips", guide.tips());
        data.put("relatedTools", guide.relatedTools());
        if (topic != null && !topic.isBlank()) {
            data.put("requestedTopic", topic);
        }
        return new AssistantDtos.ToolResult("guide", guide.title(), data);
    }

    private AssistantDtos.ToolResult sendEmail(Map<String, Object> args) {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("channel", "EMAIL");
        body.put("recipient", args.get("recipient"));
        body.put("subject", args.get("subject"));
        if (args.containsKey("templateCode")) {
            body.put("templateCode", args.get("templateCode"));
        }
        if (args.containsKey("body")) {
            body.put("body", args.get("body"));
            body.put("html", args.getOrDefault("html", false));
        }
        if (args.containsKey("data")) body.put("data", args.get("data"));
        Map<String, Object> result = notificationFeign.send(body);
        Map<String, Object> data = new LinkedHashMap<>();
        data.put("status", "sent");
        data.put("recipient", args.get("recipient"));
        data.put("deliveryId", result.getOrDefault("id", ""));
        return new AssistantDtos.ToolResult("text", "Email Sent", data);
    }

    private AssistantDtos.ToolResult sendSMS(Map<String, Object> args) {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("channel", "SMS");
        body.put("recipient", args.get("recipient"));
        if (args.containsKey("templateCode")) {
            body.put("templateCode", args.get("templateCode"));
        }
        if (args.containsKey("body")) {
            body.put("body", args.get("body"));
        }
        Map<String, Object> result = notificationFeign.send(body);
        Map<String, Object> data = new LinkedHashMap<>();
        data.put("status", "sent");
        data.put("recipient", args.get("recipient"));
        data.put("deliveryId", result.getOrDefault("id", ""));
        return new AssistantDtos.ToolResult("text", "SMS Sent", data);
    }

    private AssistantDtos.ToolResult emailDocument(Map<String, Object> args) {
        String idStr = (String) args.get("documentId");
        String to = (String) args.get("to");
        boolean generated = false;

        // Step 1: Resolve to a document UUID
        UUID documentId = resolveDocumentId(idStr);

        // Step 2: If no document exists, generate one from the sale
        if (documentId == null) {
            var salePage = salesFeign.search(null, null, null, null, null, idStr, 0, 1);
            if (!salePage.content().isEmpty()) {
                UUID saleId = salePage.content().get(0).id();
                Map<String, Object> genBody = new LinkedHashMap<>();
                genBody.put("documentType", args.getOrDefault("documentType", "tax-invoice"));
                genBody.put("referenceType", "sale");
                genBody.put("referenceId", saleId.toString());
                var doc = documentFeign.generateDocument(genBody);
                documentId = UUID.fromString(doc.get("id").toString());
                generated = true;
            }
        }

        if (documentId == null) {
            throw new IllegalArgumentException("No document found or sale found for: " + idStr);
        }

        // Step 3: Email the document
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("to", to);
        if (args.containsKey("subject")) body.put("subject", args.get("subject"));
        if (args.containsKey("message")) body.put("message", args.get("message"));
        Map<String, String> result = documentFeign.emailDocument(documentId, body);

        Map<String, Object> data = new LinkedHashMap<>();
        data.put("status", "sent");
        data.put("documentId", documentId.toString());
        data.put("to", to);
        result.forEach(data::put);
        return new AssistantDtos.ToolResult("text",
            generated ? "Document Generated & Emailed" : "Document Emailed", data);
    }

    /** Finds a document by ID, reference, or sale UUID. Returns null if none found. */
    private UUID resolveDocumentId(String idStr) {
        // Try direct UUID match
        try {
            UUID id = UUID.fromString(idStr);
            var result = documentFeign.searchByRef(id.toString(), null, null, 0, 1);
            Object contentObj = result.getOrDefault("content", result.get("data"));
            if (contentObj instanceof List<?> docs && !docs.isEmpty()) {
                if (docs.get(0) instanceof Map<?, ?> m && m.get("id") != null) {
                    return UUID.fromString(m.get("id").toString());
                }
            }
        } catch (IllegalArgumentException ignored) { /* not a UUID */ }

        // Try reference search (e.g. INV-2026-000002, TAX-000001)
        var refDocs = documentFeign.searchByRef(idStr, null, null, 0, 1);
        Object refContent = refDocs.getOrDefault("content", refDocs.get("data"));
        if (refContent instanceof List<?> docs && !docs.isEmpty()) {
            if (docs.get(0) instanceof Map<?, ?> m && m.get("id") != null) {
                return UUID.fromString(m.get("id").toString());
            }
        }

        return null;
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

    private BigDecimal toBigDecimal(Object value) {
        if (value instanceof BigDecimal bd) return bd;
        if (value instanceof Number n) return BigDecimal.valueOf(n.doubleValue());
        if (value instanceof String s) {
            try { return new BigDecimal(s); } catch (Exception ignored) {}
        }
        return BigDecimal.ZERO;
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
            return "Discount or feature product " + expiring.get(0).batchNumber() + " before expiry risk grows.";
        }
        if (!topProducts.isEmpty()) {
            return "Keep " + topProducts.get(0).productName() + " visible and fully stocked; it is leading revenue.";
        }
        return "Review yesterday's sales and focus today on replenishment, merchandising, and customer follow-up.";
    }
}
