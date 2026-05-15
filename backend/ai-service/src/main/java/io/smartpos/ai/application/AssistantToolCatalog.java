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
            new ToolDef("getSalesReport", "Get sales summary for a date range",
                Map.of("type","object","properties", Map.of(
                    "dateFrom", Map.of("type","string","description","Start date YYYY-MM-DD"),
                    "dateTo", Map.of("type","string","description","End date YYYY-MM-DD"),
                    "groupBy", Map.of("type","string","enum",List.of("day","week","month"))
                ),"required",List.of("dateFrom","dateTo")), false, null),

            new ToolDef("getTopProducts", "Get top selling products",
                Map.of("type","object","properties", Map.of(
                    "limit", Map.of("type","integer","description","Number of products, max 20"),
                    "dateFrom", Map.of("type","string","description","Start date YYYY-MM-DD"),
                    "dateTo", Map.of("type","string","description","End date YYYY-MM-DD")
                ),"required",List.of("limit")), false, null),

            new ToolDef("checkStock", "Check current stock levels for products",
                Map.of("type","object","properties", Map.of(
                    "productIds", Map.of("type","array","items", Map.of("type","string"),"description","Product UUIDs"),
                    "warehouseId", Map.of("type","string","description","Warehouse UUID, optional")
                ),"required",List.of("productIds")), false, null),

            new ToolDef("getTopCustomers", "Get top customers by sales",
                Map.of("type","object","properties", Map.of(
                    "limit", Map.of("type","integer","description","Number of customers, max 20"),
                    "dateFrom", Map.of("type","string","description","Start date YYYY-MM-DD"),
                    "dateTo", Map.of("type","string","description","End date YYYY-MM-DD")
                ),"required",List.of("limit")), false, null),

            new ToolDef("getFinancialSummary", "Get financial summary: revenue, expenses, profit",
                Map.of("type","object","properties", Map.of(
                    "dateFrom", Map.of("type","string","description","Start date YYYY-MM-DD"),
                    "dateTo", Map.of("type","string","description","End date YYYY-MM-DD")
                ),"required",List.of("dateFrom","dateTo")), false, null),

            new ToolDef("getExpiringStock", "Get products expiring soon",
                Map.of("type","object","properties", Map.of(
                    "daysFromNow", Map.of("type","integer","description","Days until expiry, default 30")
                ),"required",List.of()), false, null),

            new ToolDef("getLowStock", "Get products below reorder threshold",
                Map.of("type","object","properties", Map.of()), false, null),

            new ToolDef("searchProducts", "Search products by name, SKU, or barcode",
                Map.of("type","object","properties", Map.of(
                    "query", Map.of("type","string","description","Search term"),
                    "limit", Map.of("type","integer","description","Max results, default 10")
                ),"required",List.of("query")), false, null),

            new ToolDef("getRecentSales", "Get recent sales transactions",
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
            new ToolDef("listTenants", "List all tenants on the platform",
                Map.of("type","object","properties", Map.of(
                    "status", Map.of("type","string","enum",List.of("TRIAL","ACTIVE","SUSPENDED","PAST_DUE"))
                ),"required",List.of()), false, null)
        );
    }
}
