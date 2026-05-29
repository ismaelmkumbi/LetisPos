package io.smartpos.ai.application;

import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Component;

import java.util.*;
import java.util.stream.Collectors;

@Component
public class AssistantToolCatalog {

    public record ToolDef(
        String name,
        String description,
        Map<String, Object> parameters,
        boolean write,
        String requiredPermission
    ) {}

    private final IntentClassifierService classifier;

    public AssistantToolCatalog(IntentClassifierService classifier) {
        this.classifier = classifier;
    }

    @SuppressWarnings("unchecked")
    public List<ToolDef> scopedTools(Jwt jwt) {
        var roles = (List<String>) jwt.getClaims().get("roles");
        RoleProfile profile = RoleProfile.fromJwt(roles);
        boolean isPlatform = profile.isPlatformLevel();
        var permissions = (List<String>) jwt.getClaims().get("permissions");
        Set<String> permSet = permissions != null ? new HashSet<>(permissions) : Set.of();
        String billingPlan = jwt.getClaimAsString("billingPlan");
        boolean canWrite = isPlatform
            || "BUSINESS".equals(billingPlan)
            || "PROFESSIONAL".equals(billingPlan)
            || "ENTERPRISE".equals(billingPlan);

        List<ToolDef> tools = new ArrayList<>();
        tools.addAll(readTools());
        if (canWrite) tools.addAll(writeTools());
        if (isPlatform) tools.addAll(adminTools());

        // Per-role read scope: cashiers don't need finance/anomalies/margins.
        if (profile == RoleProfile.CASHIER) {
            tools.removeIf(t -> CASHIER_DENIED_TOOLS.contains(t.name()));
        }

        tools.removeIf(t ->
            !isPlatform && t.requiredPermission() != null
            && !permSet.contains(t.requiredPermission()));
        return tools;
    }

    private static final Set<String> CASHIER_DENIED_TOOLS = Set.of(
        "getFinancialSummary", "getExpenseSummary", "getProductMargins",
        "getStockValuation", "getDeadStock", "getBusinessAnomalies",
        "getDiscountSummary", "getTaxSummary", "getSalesComparison",
        "getReorderSuggestions"
    );

    /**
     * Narrow tools using intent classification. When confidence is >= 0.5,
     * only tools matching the primary domain are sent. Falls back to all
     * scoped tools when uncertain.
     */
    public List<ToolDef> scopedTools(Jwt jwt, String message) {
        List<ToolDef> allScoped = scopedTools(jwt);
        var intent = classifier.classify(message);
        Set<String> allNames = allScoped.stream()
            .map(ToolDef::name).collect(Collectors.toSet());
        Set<String> narrowed = classifier.narrowTools(intent, allNames);
        if (narrowed.size() == allNames.size()) return allScoped;
        return allScoped.stream()
            .filter(t -> narrowed.contains(t.name()))
            .toList();
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

            new ToolDef("getSalesByCustomer", "Get sales summary for a specific customer. Use this when asked about a customer's purchases, buying history, or how much a customer has spent.",
                Map.of("type","object","properties", Map.of(
                    "customerId", Map.of("type","string","description","Customer UUID"),
                    "dateFrom", Map.of("type","string","description","Start date YYYY-MM-DD"),
                    "dateTo", Map.of("type","string","description","End date YYYY-MM-DD")
                ),"required",List.of("customerId")), false, null),

            new ToolDef("getSalesByStatus", "Get sales filtered by status. Use this for pending orders, completed sales, refunded transactions, or any status-specific sales query.",
                Map.of("type","object","properties", Map.of(
                    "status", Map.of("type","string","enum",List.of("DRAFT","CONFIRMED","CANCELLED","RETURNED")),
                    "dateFrom", Map.of("type","string","description","Start date YYYY-MM-DD"),
                    "dateTo", Map.of("type","string","description","End date YYYY-MM-DD"),
                    "limit", Map.of("type","integer","description","Max results, default 25")
                ),"required",List.of("status")), false, null),

            new ToolDef("getSalesByPaymentMethod", "Get sales broken down by payment method (cash, mobile money, credit, etc.). Use this for 'how are customers paying?', payment mix analysis, and cash vs credit questions.",
                Map.of("type","object","properties", Map.of(
                    "dateFrom", Map.of("type","string","description","Start date YYYY-MM-DD"),
                    "dateTo", Map.of("type","string","description","End date YYYY-MM-DD")
                ),"required",List.of("dateFrom","dateTo")), false, null),

            new ToolDef("getSalesComparison", "Compare sales between two time periods. Use this for 'how are we doing vs last week/month?', period-over-period comparisons, and trend analysis.",
                Map.of("type","object","properties", Map.of(
                    "period1From", Map.of("type","string","description","First period start YYYY-MM-DD"),
                    "period1To", Map.of("type","string","description","First period end YYYY-MM-DD"),
                    "period2From", Map.of("type","string","description","Second period start YYYY-MM-DD"),
                    "period2To", Map.of("type","string","description","Second period end YYYY-MM-DD")
                ),"required",List.of("period1From","period1To","period2From","period2To")), false, null),

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

            new ToolDef("getDiscountSummary", "Get total discounts given in a period — total amount, how many sales had discounts, and average discount. Use this for discount analysis and promotion effectiveness questions.",
                Map.of("type","object","properties", Map.of(
                    "dateFrom", Map.of("type","string","description","Start date YYYY-MM-DD"),
                    "dateTo", Map.of("type","string","description","End date YYYY-MM-DD")
                ),"required",List.of("dateFrom","dateTo")), false, null),

            new ToolDef("getTaxSummary", "Get total tax collected in a period, broken down by tax rate. Use this for tax filing preparation, VAT questions, and tax reporting.",
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

            new ToolDef("getStockByWarehouse", "Get stock summary for a specific warehouse showing total products, stock value, and low-stock counts. Use this for warehouse-level inventory questions or when the user asks about a specific warehouse.",
                Map.of("type","object","properties", Map.of(
                    "warehouseId", Map.of("type","string","description","Warehouse UUID, omit for all warehouses")
                ),"required",List.of()), false, null),

            new ToolDef("getStockOverview", "Get a complete stock overview: total products, total stock value, available vs on-hand counts, and a list of all products with their current stock levels. Use this for 'all stock', 'stock overview', 'show me everything in stock', and general inventory overview questions.",
                Map.of("type","object","properties", Map.of(
                    "limit", Map.of("type","integer","description","Max products to list, default 50")
                ),"required",List.of()), false, null),

            new ToolDef("searchProducts", "Search products by name, SKU, or barcode. Use this before stock checks when the user does not provide a UUID.",
                Map.of("type","object","properties", Map.of(
                    "query", Map.of("type","string","description","Search term"),
                    "limit", Map.of("type","integer","description","Max results, default 10")
                ),"required",List.of("query")), false, null),

            new ToolDef("getProductDetail", "Get detailed product information including price, cost, category, brand, stock, and barcode. Use this when the user asks about a specific product's details, pricing, or full information.",
                Map.of("type","object","properties", Map.of(
                    "query", Map.of("type","string","description","Product name, SKU, or barcode")
                ),"required",List.of("query")), false, null),

            new ToolDef("getProductsByCategory", "List products in a specific category. Use this when asked about products in a category, category inventory, or what's available under a category.",
                Map.of("type","object","properties", Map.of(
                    "categoryId", Map.of("type","string","description","Category UUID"),
                    "limit", Map.of("type","integer","description","Max results, default 50")
                ),"required",List.of("categoryId")), false, null),

            new ToolDef("getProductsByBrand", "List products from a specific brand. Use this for brand queries, checking a brand's product line, or brand performance questions.",
                Map.of("type","object","properties", Map.of(
                    "brandId", Map.of("type","string","description","Brand UUID"),
                    "limit", Map.of("type","integer","description","Max results, default 50")
                ),"required",List.of("brandId")), false, null),

            new ToolDef("getInactiveProducts", "List disabled or inactive products. Use this for product cleanup, reactivation, or checking which products are hidden from POS.",
                Map.of("type","object","properties", Map.of(
                    "limit", Map.of("type","integer","description","Max results, default 50")
                ),"required",List.of()), false, null),

            new ToolDef("getProductCounts", "Get product counts: total products, active vs inactive, and products per category. Use this for catalog overview and product portfolio questions.",
                Map.of("type","object","properties", Map.of()), false, null),

            new ToolDef("getProductMargins", "Get product profit margins (price minus cost) across the catalog. Shows highest and lowest margin products. Use this for profitability analysis, pricing review, and margin questions.",
                Map.of("type","object","properties", Map.of(
                    "limit", Map.of("type","integer","description","Number of top/bottom margin products, default 10")
                ),"required",List.of()), false, null),

            new ToolDef("getProductPriceRange", "Get price distribution across the product catalog: cheapest, most expensive, average price, and products grouped by price range. Use this for pricing overview and price analysis questions.",
                Map.of("type","object","properties", Map.of()), false, null),

            new ToolDef("getProductInventory", "Get a combined view of all products with their current stock levels. Shows product name, price, and available quantity. Use this for 'show me all products with stock', 'what do we have in stock right now?', or combined product+inventory queries.",
                Map.of("type","object","properties", Map.of(
                    "limit", Map.of("type","integer","description","Max products, default 50")
                ),"required",List.of()), false, null),

            new ToolDef("getLatestProduct", "Get the single most recently added product in the catalog, including its current stock level. Use this for 'last product added', 'latest product', 'newest item', 'recently added product'. For multiple recently added products, use getLatestProducts.",
                Map.of("type","object","properties", Map.of()), false, null),

            new ToolDef("getLatestProducts", "Get the last N products added to the catalog, newest first. Includes name, SKU, price, status, creation date, and stock level. Use this for 'what products were added today?', 'show recently added products', 'last 10 products added', 'new arrivals', or 'what is new in the catalog?'.",
                Map.of("type","object","properties", Map.of(
                    "limit", Map.of("type","integer","description","Number of products, default 10, max 50"),
                    "daysBack", Map.of("type","integer","description","Only show products added within this many days, default 30")
                ),"required",List.of()), false, null),

            new ToolDef("getInventoryMovements", "Get stock movement history (adjustments) for a date range or specific product. Shows movement type, product, quantity change, warehouse, reason, reference, date, and user. Use this for 'why did stock reduce?', 'who adjusted this item?', 'show stock movement for Coke', 'stock adjustment history', 'inventory changes'.",
                Map.of("type","object","properties", Map.of(
                    "productName", Map.of("type","string","description","Product name to filter movements by (e.g. 'Coke')"),
                    "dateFrom", Map.of("type","string","description","Start date YYYY-MM-DD"),
                    "dateTo", Map.of("type","string","description","End date YYYY-MM-DD"),
                    "warehouseId", Map.of("type","string","description","Warehouse UUID, optional"),
                    "limit", Map.of("type","integer","description","Max results, default 20")
                ),"required",List.of()), false, null),

            new ToolDef("getStockValuation", "Calculate total inventory value: how much money is tied up in stock. Shows total cost value, total selling value, quantity on hand, and estimated gross margin. Use this for 'what is my stock worth?', 'how much money is tied in inventory?', 'inventory valuation', 'stock value report'.",
                Map.of("type","object","properties", Map.of(
                    "warehouseId", Map.of("type","string","description","Warehouse UUID, omit for all warehouses")
                ),"required",List.of()), false, null),

            new ToolDef("getDeadStock", "Identify products with stock on hand but low or no recent sales — slow-moving and dead inventory. Combines current stock levels with sales history. Use this for 'which products are not moving?', 'what should I discount?', 'dead stock report', 'slow moving items', 'stagnant inventory'.",
                Map.of("type","object","properties", Map.of(
                    "daysWithoutSales", Map.of("type","integer","description","Days without significant sales to consider dead, default 30"),
                    "minStockQty", Map.of("type","number","description","Minimum stock on hand to consider, default 1"),
                    "limit", Map.of("type","integer","description","Max results, default 20")
                ),"required",List.of()), false, null),

            new ToolDef("getReorderSuggestions", "Get AI-powered restock recommendations based on current stock levels, sales velocity, low-stock thresholds, and reorder rules. Each suggestion includes product name, current stock, suggested order quantity, supplier info, urgency level, and daily sales velocity. Use this for 'what should I order today?', 'what needs restocking?', 'reorder suggestions', 'restock recommendations', 'purchase recommendations', 'what should I buy?'.",
                Map.of("type","object","properties", Map.of()), false, null),

            new ToolDef("getCustomerProfile", "Get complete customer intelligence summary: total spend, last purchase date, top purchased products, contact info, credit limit, and outstanding balance. Use this for 'tell me about customer John', 'what does this customer usually buy?', 'customer profile', 'customer 360 view', 'customer insights'.",
                Map.of("type","object","properties", Map.of(
                    "customerName", Map.of("type","string","description","Customer name to search for (e.g. John). Picks the top match.")
                ),"required",List.of("customerName")), false, null),

            new ToolDef("getBusinessAnomalies", "Detect operational anomalies: unusual sales drops, excessive discounts, stockouts, negative stock, failed payments, suspicious voids or refunds. Use this for 'anything wrong today?', 'what should I check?', 'anomalies report', 'business health check', 'operational alerts', 'what looks off?'.",
                Map.of("type","object","properties", Map.of(
                    "dateFrom", Map.of("type","string","description","Start date YYYY-MM-DD, defaults to 7 days ago"),
                    "dateTo", Map.of("type","string","description","End date YYYY-MM-DD, defaults to today")
                ),"required",List.of()), false, null),

            new ToolDef("getProductTimeline", "Get the complete lifecycle and history of a product: when it was added, price changes, stock movements, and recent sales activity. Use this for 'when was this product added?', 'who changed this product price?', 'product history', 'product audit trail', 'product lifecycle'.",
                Map.of("type","object","properties", Map.of(
                    "query", Map.of("type","string","description","Product name, SKU, or barcode")
                ),"required",List.of("query")), false, null),

            new ToolDef("getProductSearch", "Advanced product search with optional category and brand filters. Use this for multi-filter product queries or when the user asks to find products matching multiple criteria.",
                Map.of("type","object","properties", Map.of(
                    "query", Map.of("type","string","description","Search term (name, SKU, or barcode)"),
                    "categoryId", Map.of("type","string","description","Category UUID, optional"),
                    "brandId", Map.of("type","string","description","Brand UUID, optional"),
                    "limit", Map.of("type","integer","description","Max results, default 25")
                ),"required",List.of("query")), false, null),

            new ToolDef("searchSales", "Search sales by reference number (e.g. INV-2026-000002) or status. Returns matching sales with their UUID (id). Use this to find a specific sale by its INV reference before generating or emailing its document.",
                Map.of("type","object","properties", Map.of(
                    "ref", Map.of("type","string","description","Sale reference number (e.g. INV-2026-000002)"),
                    "status", Map.of("type","string","description","Sale status (CONFIRMED, DRAFT, etc.)"),
                    "limit", Map.of("type","integer","description","Max results, default 10")
                ),"required",List.of()), false, null),

            new ToolDef("getRecentSales", "Get recent sales transactions. Use this for latest orders, recent receipts, transaction lookup, and last sales questions.",
                Map.of("type","object","properties", Map.of(
                    "limit", Map.of("type","integer","description","Number of sales, max 25")
                ),"required",List.of()), false, null),

            new ToolDef("getDailySnapshot", "Get a real-time snapshot of today: today's sales so far, current low-stock items, and upcoming expiry risks. Use this for 'how is today going?', 'show me the store right now', or live dashboards.",
                Map.of("type","object","properties", Map.of(
                ),"required",List.of()), false, null),

            new ToolDef("getExpenseSummary", "Get expense overview for a date range. Use this for expense questions, cost tracking, and spending analysis.",
                Map.of("type","object","properties", Map.of(
                    "dateFrom", Map.of("type","string","description","Start date YYYY-MM-DD"),
                    "dateTo", Map.of("type","string","description","End date YYYY-MM-DD")
                ),"required",List.of("dateFrom","dateTo")), false, null),

            new ToolDef("getNotificationTemplates", "List available notification templates (email and SMS). Use this before sending templated emails or SMS to find the right template code.",
                Map.of("type","object","properties", Map.of(
                    "channel", Map.of("type","string","enum",List.of("EMAIL","SMS","WHATSAPP"))
                ),"required",List.of()), false, null),

            new ToolDef("generateDocument", "Generate a document from a sale, purchase, or payment. The system supports: tax-invoice, proforma-invoice, quotation, payment-receipt, credit-note, debit-note, delivery-note, purchase-order, goods-received, customer-statement, stock-transfer, stock-count, stock-adjustment, batch-traceability, expiry-report, journal-voucher, payment-voucher, receipt-voucher, expense-voucher. Use tax-invoice for sales invoices, payment-receipt for payment confirmations, quotation for price quotes. Use this when a customer asks for a document and none exists yet.",
                Map.of("type","object","properties", Map.of(
                    "documentType", Map.of("type","string","description","Document type (e.g. tax-invoice, payment-receipt, quotation). Default: tax-invoice"),
                    "referenceType", Map.of("type","string","description","Source type: sale, purchase, payment, or stock"),
                    "referenceId", Map.of("type","string","description","Source UUID or sale reference like INV-2026-000001")
                ),"required",List.of("referenceId")), true, null),

            // ── Brand identity & document theme tools ──────────────────
            new ToolDef("getBrandProfile", "Get the tenant's current brand identity: business name, tagline, industry, colours, fonts, logo URLs, and social links. Use this before suggesting changes so you can reference the current state.",
                Map.of("type","object","properties", Map.of()), false, null),

            new ToolDef("generateLogoConcepts", "Generate 3 logo concept descriptions for the tenant's brand. Returns name, description, style for each concept. To turn a concept into an actual image, follow up with generateLogoImage on the concept the user picks.",
                Map.of("type","object","properties", Map.of()), false, null),

            new ToolDef("generateColorPalette", "Generate a 5-colour brand palette suited to the tenant's industry and brand tone. Returns an array of hex colours.",
                Map.of("type","object","properties", Map.of()), false, null),

            new ToolDef("suggestBrandFonts", "Suggest 3 font pairings for the tenant's brand. Returns family + category + preview for each.",
                Map.of("type","object","properties", Map.of()), false, null),

            new ToolDef("generateLogoImage", "Generate an actual logo image (PNG) using the configured image-gen provider (DALL-E 3 by default). Returns either a job id (async) or a direct URL when generation is sync. Stubbed when no provider key is set — call generateLogoConcepts then ask the user to upload a designer-made logo.",
                Map.of("type","object","properties", Map.of(
                    "prompt", Map.of("type","string","description","Free-text description of the logo to generate (e.g. 'minimalist apothecary mortar and pestle in deep green, no text')"),
                    "style", Map.of("type","string","description","Optional style hint: minimalist, vintage, playful, corporate")
                ),"required",List.of("prompt")), true, null),

            new ToolDef("enhanceLogo", "Run logo-enhancement: background removal + thermal-print optimisation + colour-palette extraction from an uploaded logo. Returns enhanced URLs and a derived palette. Stubbed when no enhancement provider is configured.",
                Map.of("type","object","properties", Map.of(
                    "logoUrl", Map.of("type","string","description","Public URL of the logo to enhance")
                ),"required",List.of("logoUrl")), true, null),

            new ToolDef("generateDocumentTheme", "Generate a complete document theme (primary/secondary/accent/surface/text/border colours) derived from the tenant's brand. Use this when the user asks for a fresh invoice/receipt look.",
                Map.of("type","object","properties", Map.of(
                    "docType", Map.of("type","string","description","Optional doc type to scope the theme to (invoice, receipt, quotation, …). Omit for the global default.")
                ),"required",List.of()), false, null),

            new ToolDef("previewDocument", "Preview an invoice / receipt / quotation rendered with the tenant's current brand profile and a synthetic sample sale — no real sale needed. Use this during setup so the tenant can see exactly what their documents will look like.",
                Map.of("type","object","properties", Map.of(
                    "documentType", Map.of("type","string","description","tax-invoice, payment-receipt, quotation, delivery-note, credit-note. Default: tax-invoice"),
                    "sampleStyle", Map.of("type","string","description","Sample size: 'small' (1 line), 'typical' (3 lines), 'large' (8 lines). Default: typical")
                ),"required",List.of()), false, null),

            new ToolDef("getSetupProgress", "Get the tenant's platform setup checklist: brand, logo, warehouses, products, document theme, first sale. Each step has a status (done / pending / skipped) and a hint for the next action.",
                Map.of("type","object","properties", Map.of()), false, null),

            new ToolDef("askClarification", "Ask the user a clarifying question instead of guessing. Use this whenever a request is ambiguous (e.g. 'email it to John' — which document? which John?; 'show stock for the new one' — which product?). Provide 2-4 concrete options when you can. Do NOT use this for questions the user has already answered in the conversation.",
                Map.of("type","object","properties", Map.of(
                    "question", Map.of("type","string","description","The single, specific question to ask"),
                    "options", Map.of("type","array","items", Map.of("type","string"),
                        "description","2-4 concrete options the user can pick; omit for free-form questions"),
                    "reason", Map.of("type","string","description","One-line reason this clarification is needed")
                ),"required",List.of("question")), false, null),

            new ToolDef("teachModule", "Teach the user how to use a Letis POS module step by step. Use this whenever the user asks 'how do I use X', 'how does X work', 'walk me through X', 'guide me on X', 'I'm new — show me X', or any onboarding/teaching question. Modules: pos (point of sale), sales, inventory, products, customers, reports, finance, expenses, payments, documents, notifications, settings, users (roles & users), warehouses. The tool returns a structured guide with steps, role notes, and tips. Pass lang='sw' for Swahili content where available.",
                Map.of("type","object","properties", Map.of(
                    "module", Map.of("type","string","description","Module slug: pos, sales, inventory, products, customers, reports, finance, expenses, payments, documents, notifications, settings, users, warehouses"),
                    "topic", Map.of("type","string","description","Optional specific topic within the module (e.g. 'add a new product', 'refund a sale')"),
                    "lang", Map.of("type","string","description","Language for the guide: 'en' (default) or 'sw' for Swahili")
                ),"required",List.of("module")), false, null),

            new ToolDef("searchDocuments", "Search for generated documents (invoices, receipts, quotations). Use q to search by document number (e.g. TAX-000001, PAY-000001). To find documents for a specific sale (e.g. INV-2026-000002), first use searchSales to get the sale UUID, then use the sale UUID as the q parameter here.",
                Map.of("type","object","properties", Map.of(
                    "q", Map.of("type","string","description","Search by document number, reference, or linked entity UUID"),
                    "documentType", Map.of("type","string","enum",List.of("tax-invoice","payment-receipt","quotation","credit-note","purchase-order","delivery-note")),
                    "status", Map.of("type","string","description","Document status (draft, sent)")
                ),"required",List.of()), false, null)
        );
    }

    private List<ToolDef> writeTools() {
        return List.of(
            new ToolDef("createProduct", "Create a new product. Provide name, price, cost, category (optional), brand (optional), and SKU (optional). Use this when the merchant wants to add a new product to their catalog.",
                Map.of("type","object","properties", Map.of(
                    "name", Map.of("type","string","description","Product name"),
                    "price", Map.of("type","number","description","Selling price in TZS"),
                    "cost", Map.of("type","number","description","Cost price in TZS"),
                    "sku", Map.of("type","string","description","SKU code, optional"),
                    "categoryId", Map.of("type","string","description","Category UUID, optional"),
                    "brandId", Map.of("type","string","description","Brand UUID, optional")
                ),"required",List.of("name","price","cost")), true, "product.create"),

            new ToolDef("updateProductPrice", "Update a product's selling price and/or cost price. Provide the product UUID or name, and the new price or cost. Use this when the merchant wants to change prices.",
                Map.of("type","object","properties", Map.of(
                    "productId", Map.of("type","string","description","Product UUID"),
                    "productName", Map.of("type","string","description","Product name (used to look up UUID)"),
                    "price", Map.of("type","number","description","New selling price in TZS"),
                    "cost", Map.of("type","number","description","New cost price in TZS")
                ),"required",List.of()), true, "product.update"),

            new ToolDef("createCustomer", "Create a new customer. Provide name and at least one contact method (phone, email, or address). Use this when the merchant wants to add a new customer.",
                Map.of("type","object","properties", Map.of(
                    "name", Map.of("type","string","description","Customer full name"),
                    "phone", Map.of("type","string","description","Phone number"),
                    "email", Map.of("type","string","description","Email address"),
                    "address", Map.of("type","string","description","Physical address")
                ),"required",List.of("name")), true, "customer.manage"),

            new ToolDef("updateCustomer", "Update a customer's details. Provide the customer UUID and any fields to update.",
                Map.of("type","object","properties", Map.of(
                    "customerId", Map.of("type","string","description","Customer UUID"),
                    "name", Map.of("type","string","description","Updated name"),
                    "phone", Map.of("type","string","description","Updated phone"),
                    "email", Map.of("type","string","description","Updated email"),
                    "address", Map.of("type","string","description","Updated address")
                ),"required",List.of("customerId")), true, "customer.manage"),

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
                ),"required",List.of("category","amount")), true, "finance.write"),

            new ToolDef("sendEmail", "Send an email. You can send a simple email with subject and body, or use a template code for pre-designed emails. Use this when the merchant asks to email a customer.",
                Map.of("type","object","properties", Map.of(
                    "recipient", Map.of("type","string","description","Email address to send to"),
                    "subject", Map.of("type","string","description","Email subject line"),
                    "body", Map.of("type","string","description","Email body text"),
                    "templateCode", Map.of("type","string","description","Template code (e.g. 'welcome', 'receipt') — use this instead of body for templated emails"),
                    "html", Map.of("type","boolean","description","Whether body is HTML, default false")
                ),"required",List.of("recipient","subject")), true, "notification.send"),

            new ToolDef("sendSMS", "Send an SMS message. Use this when the merchant asks to text a customer.",
                Map.of("type","object","properties", Map.of(
                    "recipient", Map.of("type","string","description","Phone number to send to"),
                    "body", Map.of("type","string","description","SMS message text"),
                    "templateCode", Map.of("type","string","description","Template code for pre-designed messages")
                ),"required",List.of("recipient")), true, "notification.send"),

            new ToolDef("emailDocument", "Email a document (invoice, receipt, quotation) to a customer. The document is sent as a PDF attachment. Use this when a customer asks to receive their invoice or receipt by email.",
                Map.of("type","object","properties", Map.of(
                    "documentId", Map.of("type","string","description","Document UUID (find via searchDocuments first)"),
                    "to", Map.of("type","string","description","Recipient email address"),
                    "subject", Map.of("type","string","description","Email subject line"),
                    "message", Map.of("type","string","description","Optional personal message to include")
                ),"required",List.of("documentId","to")), true, "notification.send"),

            new ToolDef("notifyCustomer", "Send a notification to a customer through ALL available channels automatically (email + SMS + WhatsApp). Tries every channel independently — you do NOT need to ask which channel the customer prefers. The system will deliver through whichever channel succeeds. Use this when a user says 'send me', 'email me', 'notify the customer', or 'tuma risiti' without specifying a channel.",
                Map.of("type","object","properties", Map.of(
                    "customerId", Map.of("type","string","description","Customer ID (UUID) — find via searchCustomers first if unknown"),
                    "subject", Map.of("type","string","description","Message subject (used for email; SMS/WhatsApp get the body only)"),
                    "message", Map.of("type","string","description","The message to send. Required.")
                ),"required",List.of("customerId","message")), true, "notification.send"),

            new ToolDef("sendWhatsApp", "Send a WhatsApp message. Use this when the merchant explicitly asks to send via WhatsApp.",
                Map.of("type","object","properties", Map.of(
                    "recipient", Map.of("type","string","description","Phone number to WhatsApp (with country code, e.g. +255...)"),
                    "body", Map.of("type","string","description","WhatsApp message text"),
                    "templateCode", Map.of("type","string","description","Template code for pre-designed messages")
                ),"required",List.of("recipient","body")), true, "notification.send")
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
