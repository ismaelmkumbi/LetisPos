package io.smartpos.ai.application;

import java.util.List;
import java.util.Map;

/**
 * Renders human-readable summaries for write-action drafts so the user
 * approving a draft sees "Coca-Cola 500ml: 2,000 → 2,500 TZS" instead of
 * the generic "Execute updateProductPrice".
 *
 * The summary is what the customer sees in the confirmation card — the
 * single biggest trust lever on the write-action path. Bad summary →
 * user blindly approves → wrong write.
 */
public final class DraftSummarizer {

    private DraftSummarizer() {}

    @SuppressWarnings("unchecked")
    public static String summarize(String toolName, Map<String, Object> args) {
        if (args == null) args = Map.of();
        return switch (toolName) {
            case "updateProductPrice" -> {
                String name = str(args.get("productName"), str(args.get("productId"), "product"));
                String price = str(args.get("price"), null);
                String cost = str(args.get("cost"), null);
                StringBuilder sb = new StringBuilder("Update " + name);
                if (price != null) sb.append(" — set price to ").append(price);
                if (cost != null) sb.append((price != null ? "," : " — set") + " cost to ").append(cost);
                yield sb.toString();
            }
            case "createProduct" -> "Add new product: " + str(args.get("name"), "(unnamed)")
                + " at " + str(args.get("price"), "?") + " (cost " + str(args.get("cost"), "?") + ")";
            case "createCustomer" -> "Add customer: " + str(args.get("name"), "(unnamed)")
                + maybe(" phone ", args.get("phone"))
                + maybe(" email ", args.get("email"));
            case "updateCustomer" -> "Update customer " + str(args.get("customerId"), "?")
                + maybe(" → name ", args.get("name"))
                + maybe(" → phone ", args.get("phone"))
                + maybe(" → email ", args.get("email"));
            case "createPurchaseOrder" -> {
                Object items = args.get("items");
                int n = items instanceof List<?> l ? l.size() : 0;
                yield "Create purchase order: " + n + " line"
                    + (n == 1 ? "" : "s") + " to supplier " + str(args.get("supplierId"), "?");
            }
            case "adjustStock" -> "Adjust stock for product " + str(args.get("productId"), "?")
                + " to qty " + str(args.get("quantity"), "?")
                + " (reason: " + str(args.get("reason"), "—") + ")";
            case "createExpense" -> "Record expense: " + str(args.get("category"), "?")
                + " " + str(args.get("amount"), "?") + " TZS"
                + maybe(" on ", args.get("date"));
            case "sendEmail" -> "Send email to " + str(args.get("recipient"), "?")
                + " — subject: \"" + str(args.get("subject"), "(no subject)") + "\"";
            case "sendSMS" -> "Send SMS to " + str(args.get("recipient"), "?")
                + " — \"" + truncate(str(args.get("body"), ""), 60) + "\"";
            case "emailDocument" -> "Email document " + str(args.get("documentId"), "?")
                + " to " + str(args.get("to"), "?");
            case "generateDocument" -> "Generate " + str(args.get("documentType"), "tax-invoice")
                + " for " + str(args.get("referenceId"), "?");
            default -> "Execute " + toolName;
        };
    }

    private static String str(Object v, String fallback) {
        if (v == null) return fallback;
        String s = String.valueOf(v).trim();
        return s.isEmpty() ? fallback : s;
    }

    private static String maybe(String prefix, Object v) {
        String s = str(v, null);
        return s == null ? "" : prefix + s;
    }

    private static String truncate(String s, int n) {
        if (s == null) return "";
        return s.length() <= n ? s : s.substring(0, n - 1) + "…";
    }
}
