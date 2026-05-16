package io.smartpos.ai.application;

import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Component;

import java.util.*;

@Component
public class AssistantToolCatalog {

    public record ToolDef(
        String name,
        String description,
        Map<String, Object> parameters,
        boolean write,
        String requiredPermission
    ) {}

    @SuppressWarnings("unchecked")
    public List<ToolDef> scopedTools(Jwt jwt) {
        var roles = (List<String>) jwt.getClaims().get("roles");
        boolean isSuperAdmin = roles != null && roles.contains("SUPER_ADMIN");
        var permissions = (List<String>) jwt.getClaims().get("permissions");
        Set<String> permSet = permissions != null ? new HashSet<>(permissions) : Set.of();
        String billingPlan = jwt.getClaimAsString("billingPlan");
        boolean canWrite = isSuperAdmin
            || "PROFESSIONAL".equals(billingPlan)
            || "ENTERPRISE".equals(billingPlan);

        List<ToolDef> tools = new ArrayList<>();
        tools.addAll(readTools());
        if (canWrite) tools.addAll(writeTools());
        if (isSuperAdmin) tools.addAll(adminTools());

        tools.removeIf(t ->
            !isSuperAdmin && t.requiredPermission() != null
            && !permSet.contains(t.requiredPermission()));
        return tools;
    }

    private List<ToolDef> readTools() {
        return List.of(
            new ToolDef("getExecutiveBriefing", "Generate an owner-level executive briefing with sales movement, top products, top customers, low-stock risks, expiring stock, and a recommended first action. Use this for daily briefing, morning briefing, executive summary, business pulse, or what should I do first.",
                Map.of("type","object","properties", Map.of(
                    "date", Map.of("type","string","description","Briefing date YYYY-MM-DD. Defaults to yesterday because complete business days are more reliable."),
                    "topLimit", Map.of("type","integer","description","Number of top products/customers, default 5, max 10"),
                    "expiryDays", Map.of("type","integer","description","Days to check expiry risk, default 14")
                ),"required",List.of()), false, null),

            new ToolDef("getSalesReport", "Get sales summary for a date range. Use this for today's sales, weekly sales, monthly sales, revenue, totals, or sales trend questions.",
                Map.of("type","object","properties", Map.of(
                    "dateFrom", Map.of("type","string","description","Start date YYYY-MM-DD"),
                    "dateTo", Map.of("type","string","description","End date YYYY-MM-DD"),
                    "groupBy", Map.of("type","string","enum",List.of("day","week","month"))
                ),"required",List.of("dateFrom","dateTo")), false, null),

            new ToolDef("getTopProducts", "Get top selling products by revenue for a date range. Use this for best sellers, product ranking, and product performance chart questions.",
                Map.of("type","object","properties", Map.of(
                    "limit", Map.of("type","integer","description","Number of products, max 20"),
                    "dateFrom", Map.of("type","string","description","Start date YYYY-MM-DD"),
                    "dateTo", Map.of("type","string","description","End date YYYY-MM-DD")
                ),"required",List.of("limit")), false, null),

            new ToolDef("checkStock", "Check current stock levels for one product. If the user gives a product name, call searchProducts first to find the product UUID.",
                Map.of("type","object","properties", Map.of(
                    "productId", Map.of("type","string","description","Product UUID"),
                    "warehouseId", Map.of("type","string","description","Warehouse UUID, optional")
                ),"required",List.of("productId")), false, null),

            new ToolDef("checkStockByProductSearch", "Find a product by name, SKU, or barcode and then check its current stock. Use this for natural stock questions like 'how many Coca-Cola do we have?'",
                Map.of("type","object","properties", Map.of(
                    "query", Map.of("type","string","description","Product name, SKU, or barcode"),
                    "warehouseId", Map.of("type","string","description","Warehouse UUID, optional")
                ),"required",List.of("query")), false, null),

            new ToolDef("getTopCustomers", "Get top customers by sales. Use this for customer ranking, VIP customer, and buyer performance questions.",
                Map.of("type","object","properties", Map.of(
                    "limit", Map.of("type","integer","description","Number of customers, max 20"),
                    "dateFrom", Map.of("type","string","description","Start date YYYY-MM-DD"),
                    "dateTo", Map.of("type","string","description","End date YYYY-MM-DD")
                ),"required",List.of("limit")), false, null),

            new ToolDef("getFinancialSummary", "Get financial summary for a date range. Use this for finance, revenue mix, and high-level money questions.",
                Map.of("type","object","properties", Map.of(
                    "dateFrom", Map.of("type","string","description","Start date YYYY-MM-DD"),
                    "dateTo", Map.of("type","string","description","End date YYYY-MM-DD")
                ),"required",List.of("dateFrom","dateTo")), false, null),

            new ToolDef("getExpiringStock", "Get products expiring soon. Use this for expiry risk, near-expiry stock, and products to discount urgently.",
                Map.of("type","object","properties", Map.of(
                    "daysFromNow", Map.of("type","integer","description","Days until expiry, default 30")
                ),"required",List.of()), false, null),

            new ToolDef("getLowStock", "Get products below reorder threshold. Use this for low stock, reorder, stockout risk, and replenishment questions.",
                Map.of("type","object","properties", Map.of()), false, null),

            new ToolDef("searchProducts", "Search products by name, SKU, or barcode. Use this before stock checks when the user does not provide a UUID.",
                Map.of("type","object","properties", Map.of(
                    "query", Map.of("type","string","description","Search term"),
                    "limit", Map.of("type","integer","description","Max results, default 10")
                ),"required",List.of("query")), false, null),

            new ToolDef("getRecentSales", "Get recent sales transactions. Use this for latest orders, recent receipts, transaction lookup, and last sales questions.",
                Map.of("type","object","properties", Map.of(
                    "limit", Map.of("type","integer","description","Number of sales, max 25")
                ),"required",List.of()), false, null)
        );
    }

    private List<ToolDef> writeTools() {
        return List.of(
            new ToolDef("createPurchaseOrder", "Create a purchase order for restocking",
                Map.of("type","object","properties", Map.of(
                    "supplierId", Map.of("type","string","description","Supplier UUID"),
                    "items", Map.of("type","array","items", Map.of("type","object","properties", Map.of(
                        "productId", Map.of("type","string"),
                        "quantity", Map.of("type","number"),
                        "unitCost", Map.of("type","number")
                    ),"required",List.of("productId","quantity")))
                ),"required",List.of("supplierId","items")), true, "purchase.create"),

            new ToolDef("adjustStock", "Adjust stock level for a product",
                Map.of("type","object","properties", Map.of(
                    "productId", Map.of("type","string","description","Product UUID"),
                    "warehouseId", Map.of("type","string","description","Warehouse UUID"),
                    "quantity", Map.of("type","number","description","New quantity"),
                    "reason", Map.of("type","string","description","Reason for adjustment")
                ),"required",List.of("productId","quantity","reason")), true, "inventory.adjust"),

            new ToolDef("createExpense", "Record a business expense",
                Map.of("type","object","properties", Map.of(
                    "category", Map.of("type","string"),
                    "amount", Map.of("type","number"),
                    "description", Map.of("type","string"),
                    "date", Map.of("type","string","description","Date YYYY-MM-DD, defaults to today")
                ),"required",List.of("category","amount")), true, "finance.write")
        );
    }

    private List<ToolDef> adminTools() {
        return List.of(
            new ToolDef("getTenantList", "List platform tenants. Filter by status (TRIAL, ACTIVE, SUSPENDED, PAST_DUE), plan (STARTER, BUSINESS, PROFESSIONAL, ENTERPRISE, FREE), or both.",
                Map.of("type","object","properties", Map.of(
                    "status", Map.of("type","string","enum",
                        List.of("TRIAL","ACTIVE","SUSPENDED","PAST_DUE")),
                    "plan", Map.of("type","string","enum",
                        List.of("STARTER","BUSINESS","PROFESSIONAL","ENTERPRISE","FREE"))
                ),"required",List.of()), false, null),

            new ToolDef("getPlatformStats", "Get platform-wide stats: total tenants, counts by status and plan",
                Map.of("type","object","properties", Map.of()), false, null),

            new ToolDef("getPlatformSales", "Get total sales across all tenants for a date range",
                Map.of("type","object","properties", Map.of(
                    "dateFrom", Map.of("type","string","description","Start date YYYY-MM-DD, default 7 days ago"),
                    "dateTo", Map.of("type","string","description","End date YYYY-MM-DD, default today")
                ),"required",List.of()), false, null),

            new ToolDef("getTenantDetail", "Get sales, stock, and product summary for a specific tenant",
                Map.of("type","object","properties", Map.of(
                    "tenantId", Map.of("type","string","description","Tenant UUID or name to look up"),
                    "dateFrom", Map.of("type","string","description","Start date YYYY-MM-DD"),
                    "dateTo", Map.of("type","string","description","End date YYYY-MM-DD")
                ),"required",List.of("tenantId")), false, null)
        );
    }
}
