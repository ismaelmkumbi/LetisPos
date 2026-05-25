package io.smartpos.sales.application;

import io.smartpos.sales.api.dto.BrandProfileDto;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.*;

/**
 * Builds a fully-rendered sample document (tax-invoice / receipt /
 * quotation) using the tenant's current BrandProfile + synthesised
 * line items. Lets new tenants preview exactly what their invoices
 * will look like before they have any real sales — the single biggest
 * UX win during platform setup.
 */
@Service
@RequiredArgsConstructor
public class MockDocumentPreviewService {

    private final BrandProfileService brandService;

    /**
     * @param documentType  tax-invoice / payment-receipt / quotation / delivery-note / credit-note
     * @param sampleStyle   "small" (1 line) | "typical" (3 lines) | "large" (8 lines)
     */
    public Map<String, Object> preview(String documentType, String sampleStyle) {
        BrandProfileDto brand = brandService.get();
        String docType = documentType == null ? "tax-invoice" : documentType;
        String style = sampleStyle == null ? "typical" : sampleStyle;

        List<Map<String, Object>> lines = sampleLines(style);
        BigDecimal subtotal = BigDecimal.ZERO;
        for (Map<String, Object> line : lines) {
            subtotal = subtotal.add(toBd(line.get("total")));
        }
        BigDecimal taxRate = new BigDecimal("0.18"); // 18% VAT placeholder
        BigDecimal taxAmount = subtotal.multiply(taxRate).setScale(2, RoundingMode.HALF_UP);
        BigDecimal grandTotal = subtotal.add(taxAmount).setScale(2, RoundingMode.HALF_UP);

        Map<String, Object> data = new LinkedHashMap<>();
        data.put("documentType", docType);
        data.put("documentNumber", sampleDocumentNumber(docType));
        data.put("issueDate", LocalDate.now().toString());
        data.put("dueDate", LocalDate.now().plusDays(14).toString());
        data.put("currency", "TZS");

        // Brand fields the preview component needs
        Map<String, Object> brandSection = new LinkedHashMap<>();
        brandSection.put("businessName", nonBlankOr(brand.getBusinessName(), "Your Business Name"));
        brandSection.put("tagline", nonBlankOr(brand.getTagline(), "Your tagline goes here"));
        brandSection.put("logoUrl", nonBlankOr(brand.getLogoUrl(), null));
        brandSection.put("primaryColor", nonBlankOr(brand.getPrimaryColor(), "#16A34A"));
        brandSection.put("secondaryColor", nonBlankOr(brand.getSecondaryColor(), "#1E293B"));
        brandSection.put("accentColor", nonBlankOr(brand.getAccentColor(), "#F59E0B"));
        brandSection.put("fontFamily", nonBlankOr(brand.getFontFamily(), "Inter, system-ui, sans-serif"));
        brandSection.put("website", brand.getWebsite());
        data.put("brand", brandSection);

        // Synthetic customer
        Map<String, Object> customer = new LinkedHashMap<>();
        customer.put("name", "Acme Distributors Ltd");
        customer.put("email", "accounts@acme-distributors.example");
        customer.put("phone", "+255 712 345 678");
        customer.put("address", "Plot 42, Sample Street, Dar es Salaam");
        data.put("customer", customer);

        data.put("lines", lines);

        Map<String, Object> totals = new LinkedHashMap<>();
        totals.put("subtotal", subtotal);
        totals.put("taxRate", taxRate.movePointRight(2) + "%");
        totals.put("taxAmount", taxAmount);
        totals.put("grandTotal", grandTotal);
        data.put("totals", totals);

        // Helpful flag for the renderer to mark this as sample-only.
        data.put("mock", true);
        data.put("notice",
            "This is a sample document generated from your brand profile. " +
            "Real invoices use actual sale data.");

        return data;
    }

    private List<Map<String, Object>> sampleLines(String style) {
        return switch (style.toLowerCase(Locale.ROOT)) {
            case "small" -> List.of(line("Sample Product A", 1, "12000"));
            case "large" -> List.of(
                line("Premium Coffee Beans 1kg", 5, "18000"),
                line("Filter Papers (pack of 100)", 3, "6500"),
                line("Stainless Steel Tumbler", 8, "9500"),
                line("Espresso Grinder", 1, "245000"),
                line("Cold Brew Concentrate 2L", 2, "32000"),
                line("Pastry Box (12 units)", 4, "14000"),
                line("Branded T-Shirt M", 6, "22000"),
                line("Gift Voucher 50K", 2, "50000")
            );
            default /* typical */ -> List.of(
                line("Coca-Cola 500ml", 12, "2500"),
                line("Mineral Water 1L", 6, "1800"),
                line("Sliced Bread Loaf", 4, "3500")
            );
        };
    }

    private Map<String, Object> line(String name, int qty, String unitPrice) {
        BigDecimal up = new BigDecimal(unitPrice);
        BigDecimal total = up.multiply(BigDecimal.valueOf(qty));
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("name", name);
        m.put("quantity", qty);
        m.put("unitPrice", up);
        m.put("total", total);
        return m;
    }

    private String sampleDocumentNumber(String docType) {
        String prefix = switch (docType) {
            case "payment-receipt" -> "RCP";
            case "quotation" -> "QTN";
            case "delivery-note" -> "DLV";
            case "credit-note" -> "CRN";
            default -> "INV";
        };
        return prefix + "-SAMPLE-" + LocalDate.now().getYear();
    }

    private BigDecimal toBd(Object v) {
        if (v instanceof BigDecimal bd) return bd;
        if (v instanceof Number n) return BigDecimal.valueOf(n.doubleValue());
        if (v == null) return BigDecimal.ZERO;
        try { return new BigDecimal(v.toString()); } catch (Exception e) { return BigDecimal.ZERO; }
    }

    private String nonBlankOr(String v, String fallback) {
        return (v != null && !v.isBlank()) ? v : fallback;
    }
}
