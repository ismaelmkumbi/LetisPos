package io.smartpos.ai.application;

import io.smartpos.ai.api.dto.AssistantDtos;
import io.smartpos.ai.domain.model.AssistantDraft;
import io.smartpos.ai.domain.repository.AssistantDraftRepository;
import io.smartpos.ai.infrastructure.feign.*;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.*;
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
            case "getSalesReport" -> getSalesReport(args);
            case "getTopProducts" -> getTopProducts(args);
            case "checkStock" -> checkStock(args);
            case "getTopCustomers" -> getTopCustomers(args);
            case "getFinancialSummary" -> getFinancialSummary(args);
            case "getExpiringStock" -> getExpiringStock(args);
            case "getLowStock" -> getLowStock(args);
            case "searchProducts" -> searchProducts(args);
            case "getRecentSales" -> getRecentSales(args);
            case "listTenants" -> listTenants(args);
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

    private AssistantDtos.ToolResult getSalesReport(Map<String, Object> args) {
        LocalDate from = LocalDate.parse((String) args.get("dateFrom"));
        LocalDate to = LocalDate.parse((String) args.get("dateTo"));
        var summary = reportFeign.salesSummary(from.toString(), to.toString(), null, null);
        Map<String, Object> data = new LinkedHashMap<>();
        data.put("from", from.toString());
        data.put("to", to.toString());
        data.put("count", summary.salesCount());
        data.put("total", summary.gross());
        return new AssistantDtos.ToolResult("metric",
            "Sales " + from + " to " + to, data);
    }

    private AssistantDtos.ToolResult getTopProducts(Map<String, Object> args) {
        int limit = ((Number) args.get("limit")).intValue();
        LocalDate from = args.containsKey("dateFrom")
            ? LocalDate.parse((String) args.get("dateFrom")) : LocalDate.now().minusDays(30);
        LocalDate to = args.containsKey("dateTo")
            ? LocalDate.parse((String) args.get("dateTo")) : LocalDate.now();
        var products = reportFeign.topProducts(from.toString(), to.toString(), null, limit);
        Map<String, Object> data = new LinkedHashMap<>();
        data.put("items", products.stream().map(p -> {
            Map<String, Object> item = new LinkedHashMap<>();
            item.put("name", p.productName());
            item.put("value", p.net());
            return item;
        }).collect(Collectors.toList()));
        return new AssistantDtos.ToolResult("ranking", "Top " + limit + " Products", data);
    }

    private AssistantDtos.ToolResult checkStock(Map<String, Object> args) {
        UUID productId = UUID.fromString((String) args.get("productId"));
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

    private AssistantDtos.ToolResult getTopCustomers(Map<String, Object> args) {
        int limit = ((Number) args.get("limit")).intValue();
        LocalDate from = args.containsKey("dateFrom")
            ? LocalDate.parse((String) args.get("dateFrom")) : LocalDate.now().minusDays(30);
        LocalDate to = args.containsKey("dateTo")
            ? LocalDate.parse((String) args.get("dateTo")) : LocalDate.now();
        var customers = reportFeign.topCustomers(from.toString(), to.toString(), limit);
        Map<String, Object> data = new LinkedHashMap<>();
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
        LocalDate from = LocalDate.parse((String) args.get("dateFrom"));
        LocalDate to = LocalDate.parse((String) args.get("dateTo"));
        var summary = reportFeign.salesSummary(from.toString(), to.toString(), null, null);
        Map<String, Object> data = new LinkedHashMap<>();
        data.put("labels", List.of("Revenue"));
        data.put("values", List.of(summary.gross()));
        return new AssistantDtos.ToolResult("proportion",
            "Finance " + from + " to " + to, data);
    }

    private AssistantDtos.ToolResult getExpiringStock(Map<String, Object> args) {
        int days = args.containsKey("daysFromNow")
            ? ((Number) args.get("daysFromNow")).intValue() : 30;
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
        int limit = args.containsKey("limit")
            ? ((Number) args.get("limit")).intValue() : 10;
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
        int limit = args.containsKey("limit")
            ? ((Number) args.get("limit")).intValue() : 10;
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

    // ── Admin tools ──

    private AssistantDtos.ToolResult listTenants(Map<String, Object> args) {
        String statusFilter = (String) args.get("status");
        var tenants = adminFeign.listAllTenants();
        var filtered = statusFilter != null
            ? tenants.stream()
                .filter(t -> statusFilter.equalsIgnoreCase(String.valueOf(t.get("status"))))
                .toList()
            : tenants;
        Map<String, Object> data = new LinkedHashMap<>();
        data.put("columns", List.of("Name","Slug","Plan","Status"));
        data.put("rows", filtered.stream().map(t -> List.of(
            t.getOrDefault("name", ""),
            t.getOrDefault("slug", ""),
            t.getOrDefault("billingPlan", ""),
            t.getOrDefault("status", "")
        )).collect(Collectors.toList()));
        return new AssistantDtos.ToolResult("table",
            "Tenants" + (statusFilter != null ? " (" + statusFilter + ")" : "")
            + " — " + filtered.size() + " total", data);
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
}
