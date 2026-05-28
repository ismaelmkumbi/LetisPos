package io.smartpos.documents.application;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Component;

import java.util.*;

@Component
public class TemplateCompiler {

    private static final ObjectMapper mapper = new ObjectMapper();

    private static final Map<String, String> COLUMN_LABELS = Map.of(
        "#", "#",
        "name", "Item / Description",
        "qty", "Qty",
        "unitPrice", "Unit Price",
        "taxRate", "Tax %",
        "discount", "Discount",
        "total", "Total"
    );

    public String compile(String bodyHtml) {
        if (bodyHtml == null || bodyHtml.isBlank()) return "";
        String trimmed = bodyHtml.trim();
        if (!trimmed.startsWith("{")) return bodyHtml;
        try {
            @SuppressWarnings("unchecked")
            Map<String, Object> config = mapper.readValue(trimmed, Map.class);
            return compileBlocks(config);
        } catch (Exception e) {
            return bodyHtml;
        }
    }

    /**
     * Compile with explicit brand context — replaces hardcoded theme colours
     * with tenant brand values injected as Handlebars variables.
     */
    public String compileWithBrand(String bodyHtml, String primaryColor, String accentColor, String fontFamily) {
        if (bodyHtml == null || bodyHtml.isBlank()) return "";
        String trimmed = bodyHtml.trim();
        if (!trimmed.startsWith("{")) return bodyHtml;
        try {
            @SuppressWarnings("unchecked")
            Map<String, Object> config = mapper.readValue(trimmed, Map.class);
            return compileBlocksWithBrand(config, primaryColor, accentColor, fontFamily);
        } catch (Exception e) {
            return bodyHtml;
        }
    }

    /**
     * Compile with a full token map — preferred over compileWithBrand for callers
     * that have access to {@link io.smartpos.sales.application.DesignTokenService}.
     * Token keys use dot notation (e.g. "color.primary") and are resolved
     * into the CSS template as {{company.primaryColor}}, etc.
     */
    public String compileWithTokens(String bodyHtml, Map<String, String> tokens) {
        if (bodyHtml == null || bodyHtml.isBlank()) return "";
        String trimmed = bodyHtml.trim();
        if (!trimmed.startsWith("{")) return bodyHtml;
        try {
            @SuppressWarnings("unchecked")
            Map<String, Object> config = mapper.readValue(trimmed, Map.class);
            String primary = tokens.getOrDefault("color.primary", "#2563eb");
            String accent = tokens.getOrDefault("color.accent", "#F59E0B");
            String font = tokens.getOrDefault("font.body", "'Helvetica Neue',Arial,sans-serif");
            return compileBlocksWithBrand(config, primary, accent, font);
        } catch (Exception e) {
            return bodyHtml;
        }
    }

    private static final String BRAND_CSS_TEMPLATE =
        "<!DOCTYPE html><html lang=\"en\"><head><meta charset=\"UTF-8\"><style>"
        + "@page{size:A4;margin:15mm}*{box-sizing:border-box;margin:0;padding:0}"
        + "body{font-family:{{company.fontFamily}};font-size:12px;color:#1a1a1a}"
        + ".header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:30px;border-bottom:3px solid {{company.primaryColor}};padding-bottom:16px}"
        + ".logo{font-size:24px;font-weight:700;color:{{company.primaryColor}}}"
        + ".brand-logo{display:block;max-width:180px;object-fit:contain}"
        + ".company-info{text-align:right;font-size:11px;color:#555;line-height:1.5}"
        + ".doc-title{font-size:22px;font-weight:700;color:{{company.primaryColor}};margin-bottom:4px}"
        + ".doc-meta{display:flex;justify-content:space-between;margin-bottom:24px}"
        + ".meta-box{flex:1}"
        + ".meta-label{font-size:10px;text-transform:uppercase;color:#888;letter-spacing:1px;margin-bottom:2px}"
        + ".meta-value{font-size:13px;font-weight:500}"
        + "table{width:100%;border-collapse:collapse;margin-bottom:24px}"
        + "thead th{background:{{company.primaryColorLight}};padding:10px 12px;text-align:left;font-size:10px;text-transform:uppercase;letter-spacing:0.5px;color:#555;border-bottom:2px solid {{company.primaryColorBorder}}}"
        + "tbody td{padding:10px 12px;border-bottom:1px solid #e2e8f0;font-size:12px}"
        + ".text-right{text-align:right}"
        + ".totals{margin-left:auto;width:280px}"
        + ".total-row{display:flex;justify-content:space-between;padding:6px 0;font-size:12px}"
        + ".total-row.grand{border-top:2px solid {{company.primaryColor}};font-size:16px;font-weight:700;color:{{company.primaryColor}};padding-top:10px;margin-top:4px}"
        + ".footer{margin-top:40px;border-top:1px solid #e2e8f0;padding-top:16px;font-size:10px;color:#888;line-height:1.6}"
        + ".terms{margin-top:20px}"
        + ".terms h4{font-size:11px;margin-bottom:6px}"
        + ".terms p{font-size:10px;color:#666}"
        + ".signature{display:flex;justify-content:space-between;margin-top:50px}"
        + ".sig-block{text-align:center}"
        + ".sig-line{border-bottom:1px solid #1a1a1a;width:200px;margin-bottom:6px}"
        + ".sig-label{font-size:11px;color:#555}"
        + "</style></head><body>";

    // Legacy fallback — hardcoded blue for callers that haven't migrated yet
    private static final String LEGACY_CSS_TEMPLATE =
        BRAND_CSS_TEMPLATE
            .replace("{{company.primaryColor}}", "#2563eb")
            .replace("{{company.primaryColorLight}}", "#f1f5f9")
            .replace("{{company.primaryColorBorder}}", "#e2e8f0")
            .replace("{{company.fontFamily}}", "'Helvetica Neue',Arial,sans-serif");

    @SuppressWarnings("unchecked")
    private String compileBlocks(Map<String, Object> config) {
        // Use brand-aware CSS template — rendering pipeline fills {{company.*}} via Handlebars
        StringBuilder html = new StringBuilder(BRAND_CSS_TEMPLATE);

        List<String> blocks = (List<String>) config.getOrDefault("blocks", List.of());
        for (String block : blocks) {
            Map<String, Object> bc = (Map<String, Object>) config.getOrDefault(block, Map.of());
            html.append(compileBlock(block, bc));
        }

        html.append("</body></html>");
        return html.toString();
    }

    @SuppressWarnings("unchecked")
    private String compileBlocksWithBrand(Map<String, Object> config,
                                          String primaryColor, String accentColor, String fontFamily) {
        String css = BRAND_CSS_TEMPLATE
            .replace("{{company.primaryColor}}", primaryColor != null ? primaryColor : "#2563eb")
            .replace("{{company.primaryColorLight}}", primaryColor != null ? primaryColor + "15" : "#f1f5f9")
            .replace("{{company.primaryColorBorder}}", primaryColor != null ? primaryColor + "30" : "#e2e8f0")
            .replace("{{company.fontFamily}}", fontFamily != null ? fontFamily : "'Helvetica Neue',Arial,sans-serif");

        StringBuilder html = new StringBuilder(css);

        List<String> blocks = (List<String>) config.getOrDefault("blocks", List.of());
        for (String block : blocks) {
            Map<String, Object> bc = (Map<String, Object>) config.getOrDefault(block, Map.of());
            html.append(compileBlock(block, bc));
        }

        html.append("</body></html>");
        return html.toString();
    }

    @SuppressWarnings("unchecked")
    private String compileBlock(String blockName, Map<String, Object> cfg) {
        return switch (blockName) {
            case "header" -> compileHeader(cfg);
            case "meta" -> compileMeta(cfg);
            case "items" -> compileItems(cfg);
            case "totals" -> compileTotals(cfg);
            case "signature" -> compileSignature(cfg);
            case "terms" -> compileTerms(cfg);
            case "footer" -> compileFooter(cfg);
            default -> "";
        };
    }

    // ─── Header Block ────────────────────────────────────────────────

    private String compileHeader(Map<String, Object> cfg) {
        StringBuilder sb = new StringBuilder();
        sb.append("<div class=\"header\"><div>");

        if (booleanValue(cfg, "showLogo", true)) {
            sb.append("{{#if company.logoUrl}}")
                .append("<img class=\"brand-logo\" src=\"{{company.logoUrl}}\" alt=\"{{company.name}} logo\" style=\"max-height:{{company.logoSize}}px;\" />")
                .append("{{else}}")
                .append("<div class=\"logo\">{{company.name}}</div>")
                .append("{{/if}}");
        }
        if (booleanValue(cfg, "showAddress", true)) {
            sb.append("<div style=\"font-size:11px;color:#555;\">{{company.address}}</div>");
        }
        if (booleanValue(cfg, "showTin", true)) {
            sb.append("<div style=\"font-size:11px;color:#555;\">TIN: {{company.tin}}</div>");
        }

        sb.append("</div><div class=\"company-info\">");

        if (booleanValue(cfg, "showPhone", true)) {
            sb.append("<div>{{company.phone}}</div>");
        }
        if (booleanValue(cfg, "showEmail", true)) {
            sb.append("<div>{{company.email}}</div>");
        }

        sb.append("</div></div>");
        return sb.toString();
    }

    // ─── Meta Block ──────────────────────────────────────────────────

    @SuppressWarnings("unchecked")
    private String compileMeta(Map<String, Object> cfg) {
        StringBuilder sb = new StringBuilder();

        String title = (String) cfg.getOrDefault("title", "DOCUMENT");
        sb.append("<div class=\"doc-title\">").append(title).append("</div>");

        sb.append("<div class=\"doc-meta\">");

        if (booleanValue(cfg, "showNumber", true)) {
            sb.append("<div class=\"meta-box\">");
            sb.append("<div class=\"meta-label\">").append(title).append(" #</div>");
            sb.append("<div class=\"meta-value\">{{document.number}}</div>");
            sb.append("</div>");
        }
        if (booleanValue(cfg, "showDate", true)) {
            sb.append("<div class=\"meta-box\">");
            sb.append("<div class=\"meta-label\">Date</div>");
            sb.append("<div class=\"meta-value\">{{document.date}}</div>");
            sb.append("</div>");
        }
        if (booleanValue(cfg, "showDueDate", false)) {
            sb.append("<div class=\"meta-box\">");
            sb.append("<div class=\"meta-label\">Due Date</div>");
            sb.append("<div class=\"meta-value\">{{document.dueDate}}</div>");
            sb.append("</div>");
        }

        sb.append("</div>");

        if (booleanValue(cfg, "showCustomer", true)) {
            sb.append("<div class=\"doc-meta\">");
            sb.append("<div class=\"meta-box\">");
            sb.append("<div class=\"meta-label\">Customer</div>");
            sb.append("<div class=\"meta-value\">{{customer.name}}</div>");
            sb.append("<div style=\"font-size:11px;color:#555;\">{{customer.address}}</div>");
            sb.append("<div style=\"font-size:11px;color:#555;\">{{customer.phone}}</div>");
            sb.append("</div>");
            sb.append("<div class=\"meta-box\">");
            sb.append("<div class=\"meta-label\">Prepared By</div>");
            sb.append("<div class=\"meta-value\">{{preparedBy.name}}</div>");
            sb.append("</div>");
            sb.append("</div>");
        }

        return sb.toString();
    }

    // ─── Items Block ─────────────────────────────────────────────────

    @SuppressWarnings("unchecked")
    private String compileItems(Map<String, Object> cfg) {
        List<String> columns = (List<String>) cfg.getOrDefault("columns",
            List.of("#", "name", "qty", "unitPrice", "taxRate", "total"));

        StringBuilder sb = new StringBuilder();
        sb.append("<table><thead><tr>");

        for (String col : columns) {
            String label = COLUMN_LABELS.getOrDefault(col, col);
            boolean isRightAligned = col.equals("#") || col.equals("qty") || col.equals("unitPrice")
                || col.equals("taxRate") || col.equals("discount") || col.equals("total");
            String alignClass = isRightAligned ? " class=\"text-right\"" : "";
            String widthStyle = "";
            if (col.equals("#")) widthStyle = " style=\"width:40px;\"";
            else if (col.equals("qty")) widthStyle = " style=\"width:70px;\"";
            else if (col.equals("unitPrice")) widthStyle = " style=\"width:100px;\"";
            else if (col.equals("taxRate")) widthStyle = " style=\"width:50px;\"";
            else if (col.equals("discount")) widthStyle = " style=\"width:80px;\"";
            else if (col.equals("total")) widthStyle = " style=\"width:110px;\"";

            sb.append("<th").append(widthStyle).append(alignClass).append(">")
                .append(label).append("</th>");
        }

        sb.append("</tr></thead><tbody>");
        sb.append("{{#each items}}<tr>");

        for (String col : columns) {
            boolean isRightAligned = col.equals("#") || col.equals("qty") || col.equals("unitPrice")
                || col.equals("taxRate") || col.equals("discount") || col.equals("total");
            String alignClass = isRightAligned ? " class=\"text-right\"" : "";

            switch (col) {
                case "#" -> sb.append("<td").append(alignClass).append(">{{inc @index}}</td>");
                case "name" -> sb.append("<td><strong>{{name}}</strong>{{#if description}}<br><span style=\"font-size:10px;color:#888;\">{{description}}</span>{{/if}}</td>");
                case "qty" -> sb.append("<td").append(alignClass).append(">{{quantity}}</td>");
                case "unitPrice" -> sb.append("<td").append(alignClass).append(">{{unitPrice}}</td>");
                case "taxRate" -> sb.append("<td").append(alignClass).append(">{{taxRate}}%</td>");
                case "discount" -> sb.append("<td").append(alignClass).append(">{{discount}}</td>");
                case "total" -> sb.append("<td").append(alignClass).append("><strong>{{total}}</strong></td>");
                default -> sb.append("<td").append(alignClass).append(">{{").append(col).append("}}</td>");
            }
        }

        sb.append("</tr>{{/each}}</tbody></table>");
        return sb.toString();
    }

    // ─── Totals Block ────────────────────────────────────────────────

    @SuppressWarnings("unchecked")
    private String compileTotals(Map<String, Object> cfg) {
        StringBuilder sb = new StringBuilder();
        sb.append("<div class=\"totals\">");

        if (booleanValue(cfg, "showSubtotal", true)) {
            sb.append("<div class=\"total-row\"><span>Subtotal</span><span>{{totals.subtotal}}</span></div>");
        }
        if (booleanValue(cfg, "showDiscount", true)) {
            sb.append("{{#if totals.discount}}<div class=\"total-row\"><span>Discount</span><span>-{{totals.discount}}</span></div>{{/if}}");
        }
        if (booleanValue(cfg, "showTax", true)) {
            sb.append("{{#each totals.taxLines}}<div class=\"total-row\"><span>{{label}}</span><span>{{amount}}</span></div>{{/each}}");
        }
        if (booleanValue(cfg, "showGrandTotal", true)) {
            sb.append("<div class=\"total-row grand\"><span>Grand Total</span><span>{{totals.grandTotal}}</span></div>");
        }

        sb.append("</div>");
        return sb.toString();
    }

    // ─── Signature Block ─────────────────────────────────────────────

    @SuppressWarnings("unchecked")
    private String compileSignature(Map<String, Object> cfg) {
        List<String> slots = (List<String>) cfg.getOrDefault("slots",
            List.of("Prepared By", "Customer Acceptance", "Date"));

        StringBuilder sb = new StringBuilder();
        sb.append("<div class=\"signature\">");

        for (String label : slots) {
            sb.append("<div class=\"sig-block\">");
            sb.append("<div class=\"sig-line\"></div>");
            sb.append("<div class=\"sig-label\">").append(label).append("</div>");
            sb.append("</div>");
        }

        sb.append("</div>");
        return sb.toString();
    }

    // ─── Terms Block ─────────────────────────────────────────────────

    private String compileTerms(Map<String, Object> cfg) {
        if (!booleanValue(cfg, "showTerms", false)) return "";

        return "{{#if terms}}<div class=\"terms\"><h4>Terms &amp; Conditions</h4><p>{{terms}}</p></div>{{/if}}";
    }

    // ─── Footer Block ────────────────────────────────────────────────

    private String compileFooter(Map<String, Object> cfg) {
        StringBuilder sb = new StringBuilder();
        sb.append("<div class=\"footer\">");

        if (booleanValue(cfg, "showCompany", true)) {
            sb.append("<div>{{company.name}} | {{company.address}} | TIN: {{company.tin}}</div>");
        }
        if (booleanValue(cfg, "showContact", true)) {
            sb.append("<div>Phone: {{company.phone}} | Email: {{company.email}}</div>");
        }
        if (booleanValue(cfg, "showPageNumbers", true)) {
            sb.append("<div>Page 1 of 1 | Generated on {{document.date}}</div>");
        }

        sb.append("</div>");
        return sb.toString();
    }

    // ─── Helpers ─────────────────────────────────────────────────────

    private boolean booleanValue(Map<String, Object> cfg, String key, boolean defaultVal) {
        Object val = cfg.get(key);
        if (val instanceof Boolean b) return b;
        return defaultVal;
    }
}
