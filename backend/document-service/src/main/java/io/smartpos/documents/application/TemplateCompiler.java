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

    @SuppressWarnings("unchecked")
    private String compileBlocks(Map<String, Object> config) {
        StringBuilder html = new StringBuilder();
        html.append("<!DOCTYPE html><html lang=\"en\"><head><meta charset=\"UTF-8\"><style>");
        html.append("@page{size:A4;margin:15mm}*{box-sizing:border-box;margin:0;padding:0}");
        html.append("body{font-family:'Helvetica Neue',Arial,sans-serif;font-size:12px;color:#1a1a1a}");
        html.append(".header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:30px;border-bottom:3px solid #2563eb;padding-bottom:16px}");
        html.append(".logo{font-size:24px;font-weight:700;color:#2563eb}");
        html.append(".company-info{text-align:right;font-size:11px;color:#555;line-height:1.5}");
        html.append(".doc-title{font-size:22px;font-weight:700;color:#2563eb;margin-bottom:4px}");
        html.append(".doc-meta{display:flex;justify-content:space-between;margin-bottom:24px}");
        html.append(".meta-box{flex:1}");
        html.append(".meta-label{font-size:10px;text-transform:uppercase;color:#888;letter-spacing:1px;margin-bottom:2px}");
        html.append(".meta-value{font-size:13px;font-weight:500}");
        html.append("table{width:100%;border-collapse:collapse;margin-bottom:24px}");
        html.append("thead th{background:#f1f5f9;padding:10px 12px;text-align:left;font-size:10px;text-transform:uppercase;letter-spacing:0.5px;color:#555;border-bottom:2px solid #e2e8f0}");
        html.append("tbody td{padding:10px 12px;border-bottom:1px solid #e2e8f0;font-size:12px}");
        html.append(".text-right{text-align:right}");
        html.append(".totals{margin-left:auto;width:280px}");
        html.append(".total-row{display:flex;justify-content:space-between;padding:6px 0;font-size:12px}");
        html.append(".total-row.grand{border-top:2px solid #2563eb;font-size:16px;font-weight:700;color:#2563eb;padding-top:10px;margin-top:4px}");
        html.append(".footer{margin-top:40px;border-top:1px solid #e2e8f0;padding-top:16px;font-size:10px;color:#888;line-height:1.6}");
        html.append(".terms{margin-top:20px}");
        html.append(".terms h4{font-size:11px;margin-bottom:6px}");
        html.append(".terms p{font-size:10px;color:#666}");
        html.append(".signature{display:flex;justify-content:space-between;margin-top:50px}");
        html.append(".sig-block{text-align:center}");
        html.append(".sig-line{border-bottom:1px solid #1a1a1a;width:200px;margin-bottom:6px}");
        html.append(".sig-label{font-size:11px;color:#555}");
        html.append("</style></head><body>");

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
            sb.append("<div class=\"logo\">{{company.name}}</div>");
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
