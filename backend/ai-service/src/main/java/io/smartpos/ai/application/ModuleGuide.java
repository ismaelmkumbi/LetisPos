package io.smartpos.ai.application;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

/**
 * Curated, role-aware how-to content for every Letis POS module.
 * The assistant invokes this when a user asks "how do I use X" so the LLM
 * answers from authoritative, version-controlled guidance rather than
 * hallucinating UI labels.
 *
 * Each module entry has:
 *   - title          short headline
 *   - summary        one-paragraph elevator pitch
 *   - steps          ordered list of concrete steps
 *   - rolesAllowed   roles that can use this module
 *   - tips           short, high-leverage tips
 *   - relatedTools   assistant tool names the user can chain off of
 */
public final class ModuleGuide {

    public record Guide(
        String module,
        String title,
        String summary,
        List<String> steps,
        List<String> rolesAllowed,
        List<String> tips,
        List<String> relatedTools,
        // Optional Swahili variants — used when the user's language is `sw`.
        // Null means "fall back to English"; partial translations are fine.
        String titleSw,
        String summarySw,
        List<String> stepsSw
    ) {
        // Constructor for English-only guides.
        public Guide(String module, String title, String summary, List<String> steps,
                     List<String> rolesAllowed, List<String> tips, List<String> relatedTools) {
            this(module, title, summary, steps, rolesAllowed, tips, relatedTools,
                null, null, null);
        }
    }

    private static final Map<String, Guide> GUIDES = new LinkedHashMap<>();

    static {
        put(new Guide("pos",
            "Point of Sale (POS) — ringing up a sale",
            "The POS module is the cashier's primary screen. It scans products, " +
            "applies discounts, takes payment (cash, mobile money, card, credit), " +
            "and prints or emails a receipt.",
            List.of(
                "Open POS → Sales → New Sale.",
                "Scan a barcode or search the product by name in the top search bar.",
                "Adjust quantity in the line; remove a line with the trash icon.",
                "Optional: apply a line or order discount (managers can override caps).",
                "Pick a customer if it's a credit/account sale.",
                "Click Pay → choose Cash / Mobile / Card / Mixed → enter amount → Confirm.",
                "Receipt prints automatically; the sale moves to status CONFIRMED."
            ),
            List.of("CASHIER","MANAGER","OWNER","TENANT_ADMIN"),
            List.of(
                "Drafts auto-save — you can pause a sale and resume on another terminal.",
                "Returns use a separate Return flow; do not just create a negative sale."
            ),
            List.of("checkStockByProductSearch", "searchProducts", "getRecentSales"),
            "Mauzo (POS) — kupiga bili ya mauzo",
            "Moduli ya POS ndiyo skrini kuu ya mhudumu wa malipo. Inasajili bidhaa, " +
            "kutoa punguzo, kupokea malipo (cash, mobile money, kadi, mkopo), na kuchapisha au kutuma risiti kwa email.",
            List.of(
                "Fungua POS → Mauzo → Mauzo Mapya.",
                "Scan barcode au tafuta bidhaa kwa jina kwenye sehemu ya juu.",
                "Rekebisha idadi kwenye mstari; toa mstari kwa ikoni ya pipa.",
                "Hiari: ongeza punguzo la mstari au la oda nzima (meneja anaweza kuruhusu zaidi).",
                "Chagua mteja iwapo ni mauzo ya mkopo.",
                "Bonyeza Lipa → chagua Cash / Mobile / Kadi → ingiza kiasi → Thibitisha.",
                "Risiti hutoka moja kwa moja; hali ya mauzo inakuwa CONFIRMED."
            )
        ));

        put(new Guide("sales",
            "Sales — viewing, editing, and refunding sales",
            "The Sales module shows every transaction, lets you reprint receipts, " +
            "issue refunds, and email tax invoices.",
            List.of(
                "Sales → Sales List. Use the date filter on the top right.",
                "Click a sale row to see lines, payments, and linked documents.",
                "Refund: open the sale → Refund → select lines and quantities → confirm.",
                "Reprint: open the sale → Print, or send by email via Documents → Email."
            ),
            List.of("CASHIER","MANAGER","OWNER","TENANT_ADMIN"),
            List.of(
                "Only MANAGER+ can refund sales older than 24 hours.",
                "Voiding (CANCELLED) reverses stock; refunds keep the sale and reverse cash."
            ),
            List.of("searchSales", "getRecentSales", "generateDocument", "emailDocument"),
            "Mauzo — kuangalia, kuhariri na kurudisha mauzo",
            "Moduli ya Sales inaonyesha kila muamala, inakuruhusu kuchapisha tena risiti, " +
            "kurudisha pesa (refund), na kutuma ankara kwa email.",
            List.of(
                "Sales → Orodha ya Mauzo. Tumia kichujio cha tarehe juu kulia.",
                "Bonyeza mstari wa mauzo kuona bidhaa, malipo, na hati zilizounganishwa.",
                "Kurudisha pesa: fungua mauzo → Refund → chagua mistari na idadi → thibitisha.",
                "Kuchapisha tena: fungua mauzo → Print, au tuma kwa email kupitia Documents → Email."
            )
        ));

        put(new Guide("inventory",
            "Inventory — stock levels, adjustments, and expiry",
            "Inventory tracks on-hand quantities per warehouse, expiry batches, " +
            "low-stock alerts, and stock counts.",
            List.of(
                "Inventory → Stock to view live levels per warehouse.",
                "Adjust quantity: pick a product → Adjust → reason + qty → save.",
                "Stock count: Inventory → Stock Counts → New → scan or upload sheet → reconcile.",
                "Batches & expiry: Inventory → Batches to track production date and expiry."
            ),
            List.of("MANAGER","OWNER","TENANT_ADMIN"),
            List.of(
                "Stock queries need at least one warehouse — create one in Settings → Warehouses first.",
                "Reorder rules trigger reorder suggestions automatically once you set min levels."
            ),
            List.of("getStockOverview", "getLowStock", "getExpiringStock", "getReorderSuggestions"),
            "Bohari — viwango vya stock, marekebisho na muda wa kuisha",
            "Inventory hufuatilia idadi ya bidhaa zilizopo kwa kila ghala, batches za muda wa kuisha, " +
            "tahadhari za stock chache, na hesabu ya stock.",
            List.of(
                "Inventory → Stock kuona kiwango cha kila bidhaa kwa kila ghala.",
                "Rekebisha idadi: chagua bidhaa → Rekebisha → sababu na idadi → hifadhi.",
                "Hesabu ya stock: Inventory → Stock Counts → Mpya → scan au pakia karatasi → linganisha.",
                "Batches na muda wa kuisha: Inventory → Batches kufuatilia tarehe ya uzalishaji na ya kuisha."
            )
        ));

        put(new Guide("products",
            "Products — catalog management",
            "Products are the items you sell. Each product has a price, cost, " +
            "category, brand, SKU, optional barcode, and reorder rules.",
            List.of(
                "Products → All Products → New Product.",
                "Fill name, price, cost, category, brand, SKU, barcode (or auto-generate).",
                "Pricing tab: set retail, wholesale, or per-customer-tier prices.",
                "Save. The product is immediately available in POS."
            ),
            List.of("MANAGER","OWNER","TENANT_ADMIN"),
            List.of(
                "Use barcode scanner during product creation to skip typing.",
                "Inactive products are hidden from POS but kept for historical reports."
            ),
            List.of("createProduct", "updateProductPrice", "getProductDetail", "getProductCounts")
        ));

        put(new Guide("customers",
            "Customers — CRM & credit",
            "Customers stores contact info, purchase history, credit limit, " +
            "outstanding balance, and tier discounts.",
            List.of(
                "Customers → All Customers → New Customer.",
                "Name + at least one contact (phone or email).",
                "Set credit limit if you allow account sales.",
                "Customer profile shows lifetime spend, top products, and last visit."
            ),
            List.of("CASHIER","MANAGER","OWNER","TENANT_ADMIN"),
            List.of(
                "Use customer tiers to apply automatic discounts in POS.",
                "Statements can be emailed monthly via Documents → Customer Statement."
            ),
            List.of("createCustomer", "updateCustomer", "getCustomerProfile", "getTopCustomers")
        ));

        put(new Guide("reports",
            "Reports — sales, finance, and inventory analytics",
            "Reports gives sliced views of sales, profit, payment mix, taxes, " +
            "and inventory health for any date range.",
            List.of(
                "Reports → pick a category (Sales / Finance / Inventory).",
                "Set the date range and filters (warehouse, customer, payment method).",
                "Export to PDF or Excel from the top-right menu."
            ),
            List.of("MANAGER","OWNER","TENANT_ADMIN","PLATFORM_ADMIN"),
            List.of(
                "Compare two periods to spot trends; the assistant's getSalesComparison tool does this in one call.",
                "Tax summary feeds your monthly VAT/return — export the period you're filing."
            ),
            List.of("getSalesReport", "getSalesComparison", "getTaxSummary", "getTopProducts")
        ));

        put(new Guide("finance",
            "Finance — revenue, expenses, and margins",
            "Finance gives the money picture: gross/net revenue, expenses, taxes, " +
            "discounts, payment-method mix, and product-level margins.",
            List.of(
                "Finance → Dashboard for the headline metrics.",
                "Finance → Expenses to record costs (rent, utilities, payroll).",
                "Finance → Taxes for filing-ready breakdowns.",
                "Finance → Margins to see which products actually make money."
            ),
            List.of("OWNER","TENANT_ADMIN","PLATFORM_ADMIN"),
            List.of(
                "Cashiers and Managers do not see Finance — that's intentional.",
                "Record expenses the day they happen so monthly P&L is accurate."
            ),
            List.of("getFinancialSummary", "getExpenseSummary", "getProductMargins", "getTaxSummary")
        ));

        put(new Guide("expenses",
            "Expenses — recording costs",
            "Use Expenses to log every non-COGS cost: rent, salaries, utilities, " +
            "marketing, transport. These feed gross-margin and profit reports.",
            List.of(
                "Finance → Expenses → New Expense.",
                "Pick a category, amount, date, and description.",
                "Attach a receipt photo or PDF if you have one.",
                "Save — it appears in the next finance report."
            ),
            List.of("MANAGER","OWNER","TENANT_ADMIN"),
            List.of(
                "Use consistent categories so monthly reports are comparable.",
                "Recurring expenses (rent) can be scheduled to auto-create monthly."
            ),
            List.of("createExpense", "getExpenseSummary")
        ));

        put(new Guide("payments",
            "Payments — settings & reconciliation",
            "Payments configures which methods you accept (cash, M-Pesa, Tigo Pesa, " +
            "Airtel Money, card, credit), and reconciles money received against sales.",
            List.of(
                "Settings → Payments → Methods. Toggle each method on/off.",
                "Configure mobile money: enter your business shortcode + API key.",
                "Reconciliation: Payments → Reconcile picks a day and matches receipts."
            ),
            List.of("OWNER","TENANT_ADMIN","PLATFORM_ADMIN"),
            List.of(
                "Test mobile money with a 100 TZS sandbox transaction before going live.",
                "Failed payments stay in the queue — clear them weekly."
            ),
            List.of("getSalesByPaymentMethod")
        ));

        put(new Guide("documents",
            "Documents — invoices, receipts, quotations",
            "Documents generates and stores PDFs: tax invoices, payment receipts, " +
            "quotations, credit notes, delivery notes, purchase orders, customer statements.",
            List.of(
                "Open a sale or purchase → Documents → Generate.",
                "Pick the document type (tax-invoice, payment-receipt, quotation, etc.).",
                "Preview, then Send by Email or Download PDF."
            ),
            List.of("CASHIER","MANAGER","OWNER","TENANT_ADMIN"),
            List.of(
                "Templates can be customised per tenant — Settings → Document Templates.",
                "The assistant can generate and email a document for you in one step."
            ),
            List.of("generateDocument", "searchDocuments", "emailDocument")
        ));

        put(new Guide("notifications",
            "Notifications — email, SMS, WhatsApp",
            "Notifications sends transactional and marketing messages to customers " +
            "via Email, SMS, and WhatsApp using configurable templates.",
            List.of(
                "Settings → Notifications → Templates. Edit or create a template.",
                "Use template variables like {{customerName}} and {{total}}.",
                "Send: from a customer profile or sale → Send Email / SMS / WhatsApp."
            ),
            List.of("MANAGER","OWNER","TENANT_ADMIN","PLATFORM_ADMIN"),
            List.of(
                "Always preview a template before mass-sending.",
                "SMS costs per message — check your credit balance."
            ),
            List.of("sendEmail", "sendSMS", "getNotificationTemplates")
        ));

        put(new Guide("settings",
            "Settings — tenant configuration",
            "Settings is the admin hub: store profile, currency, tax rates, " +
            "warehouses, payment methods, document templates, integrations.",
            List.of(
                "Settings → Store Profile for name, logo, address, currency.",
                "Settings → Taxes to set VAT rate and tax-inclusive vs exclusive.",
                "Settings → Warehouses to add / edit / deactivate warehouses.",
                "Settings → Integrations for payment gateways and accounting links."
            ),
            List.of("OWNER","TENANT_ADMIN","PLATFORM_ADMIN"),
            List.of(
                "Changing the base currency is one-way — back up data first.",
                "Only TENANT_ADMIN+ can edit warehouses and payment integrations."
            ),
            List.of()
        ));

        put(new Guide("users",
            "Users & Roles — team access",
            "Users are the people who log in. Roles control what each can see and do.",
            List.of(
                "Settings → Users → New User. Enter name, email, phone.",
                "Pick a role: CASHIER, MANAGER, OWNER, TENANT_ADMIN.",
                "The user gets an email invite. They set their password on first login.",
                "Edit / deactivate users any time. Deactivated users keep their history but cannot log in."
            ),
            List.of("TENANT_ADMIN","OWNER","PLATFORM_ADMIN"),
            List.of(
                "Use MANAGER for shift leads who need to refund sales.",
                "Only TENANT_ADMIN can add another TENANT_ADMIN."
            ),
            List.of()
        ));

        put(new Guide("warehouses",
            "Warehouses — multi-location stock",
            "Warehouses are the physical (or virtual) locations where stock lives. " +
            "Every stock movement is tied to a warehouse. You need at least one " +
            "warehouse before stock tracking, POS reservations, and reorder suggestions work.",
            List.of(
                "Settings → Warehouses → New Warehouse.",
                "Enter code (e.g. MAIN), name, city, country, optional phone/email.",
                "Save. The warehouse is immediately usable in POS and stock screens.",
                "To deactivate: edit → toggle Active off. Existing stock stays but new movements are blocked."
            ),
            List.of("TENANT_ADMIN","OWNER","PLATFORM_ADMIN"),
            List.of(
                "If stock queries return 'No warehouses configured', this is the screen to fix it.",
                "Transfers move stock between warehouses — use Inventory → Transfers."
            ),
            List.of("getStockByWarehouse", "getStockOverview")
        ));
    }

    private static void put(Guide g) { GUIDES.put(g.module(), g); }

    public static Guide lookup(String module) {
        if (module == null) return null;
        String key = module.trim().toLowerCase(Locale.ROOT);
        return GUIDES.get(key);
    }

    public static List<String> listModules() {
        return List.copyOf(GUIDES.keySet());
    }

    /**
     * Return a localised view of the guide. When the language is "sw" and
     * Swahili content is available, swap the title, summary, and steps.
     * Other fields (tips, rolesAllowed, relatedTools) stay English because
     * they are technical labels or tool identifiers.
     */
    public static Guide localise(Guide g, String language) {
        if (g == null || !"sw".equalsIgnoreCase(language)) return g;
        return new Guide(
            g.module(),
            g.titleSw() != null ? g.titleSw() : g.title(),
            g.summarySw() != null ? g.summarySw() : g.summary(),
            g.stepsSw() != null && !g.stepsSw().isEmpty() ? g.stepsSw() : g.steps(),
            g.rolesAllowed(),
            g.tips(),
            g.relatedTools(),
            g.titleSw(), g.summarySw(), g.stepsSw()
        );
    }

    private ModuleGuide() {}
}
