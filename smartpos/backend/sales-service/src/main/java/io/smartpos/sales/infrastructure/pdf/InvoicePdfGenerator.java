package io.smartpos.sales.infrastructure.pdf;

import com.lowagie.text.*;
import com.lowagie.text.pdf.PdfPCell;
import com.lowagie.text.pdf.PdfPTable;
import com.lowagie.text.pdf.PdfWriter;
import io.smartpos.sales.domain.model.Sale;
import io.smartpos.sales.domain.model.SaleLine;
import org.springframework.stereotype.Component;

import java.awt.Color;
import java.io.ByteArrayOutputStream;
import java.math.BigDecimal;
import java.time.format.DateTimeFormatter;

/**
 * Minimal A4 invoice PDF using OpenPDF (LGPL). Renders:
 *   header (company name, invoice ref, date, customer placeholder)
 *   line items table (code, name, qty, unit, total)
 *   totals block (subtotal, discount, tax, grand total, paid, due)
 *   footer note
 *
 * This is intentionally framework-free of any template engine so it works
 * offline and has zero surprise deps. Production can switch to an HTML → PDF
 * pipeline (Flying Saucer + Thymeleaf) if designers want rich templates.
 */
@Component
public class InvoicePdfGenerator {

    private static final Font H1     = new Font(Font.HELVETICA, 18, Font.BOLD);
    private static final Font H2     = new Font(Font.HELVETICA, 12, Font.BOLD);
    private static final Font NORMAL = new Font(Font.HELVETICA, 10, Font.NORMAL);
    private static final Font SMALL  = new Font(Font.HELVETICA,  9, Font.NORMAL);

    public byte[] render(Sale sale) {
        Document doc = new Document(PageSize.A4, 48, 48, 48, 48);
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        PdfWriter.getInstance(doc, out);
        doc.open();
        try {
            // --- header ---
            Paragraph title = new Paragraph("INVOICE", H1);
            title.setAlignment(Element.ALIGN_RIGHT);
            doc.add(title);

            Paragraph biz = new Paragraph("SmartPOS", H2);
            doc.add(biz);
            doc.add(new Paragraph("Your Trusted Retail System", SMALL));
            doc.add(Chunk.NEWLINE);

            PdfPTable meta = new PdfPTable(2);
            meta.setWidthPercentage(100);
            meta.setWidths(new float[]{1, 1});
            meta.addCell(kv("Invoice #", sale.getRef()));
            meta.addCell(kv("Date", sale.getDate().format(DateTimeFormatter.ISO_LOCAL_DATE)));
            meta.addCell(kv("Status", sale.getStatus().name()));
            meta.addCell(kv("Payment", sale.getPaymentStatus().name()));
            meta.addCell(kv("Currency", sale.getCurrency()));
            meta.addCell(kv("Warehouse", sale.getWarehouseId().toString()));
            doc.add(meta);
            doc.add(Chunk.NEWLINE);

            // --- items table ---
            PdfPTable items = new PdfPTable(5);
            items.setWidthPercentage(100);
            items.setWidths(new float[]{1.2f, 3, 0.8f, 1.2f, 1.4f});
            items.addCell(th("Code"));
            items.addCell(th("Product"));
            items.addCell(th("Qty"));
            items.addCell(th("Unit"));
            items.addCell(th("Total"));
            for (SaleLine l : sale.getLines()) {
                items.addCell(td(l.getProductCodeSnapshot() == null ? "" : l.getProductCodeSnapshot()));
                items.addCell(td(l.getProductNameSnapshot()));
                items.addCell(td(l.getQty().toPlainString()));
                items.addCell(td(l.getUnitPrice().toPlainString()));
                items.addCell(td(l.getLineTotal().toPlainString()));
            }
            doc.add(items);
            doc.add(Chunk.NEWLINE);

            // --- totals ---
            PdfPTable totals = new PdfPTable(2);
            totals.setWidthPercentage(50);
            totals.setHorizontalAlignment(Element.ALIGN_RIGHT);
            totals.setWidths(new float[]{1, 1});
            totals.addCell(kvLabel("Subtotal"));
            totals.addCell(kvAmount(sale.getSubtotal(), sale.getCurrency()));
            totals.addCell(kvLabel("Discount"));
            totals.addCell(kvAmount(sale.getDiscountTotal(), sale.getCurrency()));
            totals.addCell(kvLabel("Tax"));
            totals.addCell(kvAmount(sale.getTaxTotal(), sale.getCurrency()));
            totals.addCell(kvLabel("Shipping"));
            totals.addCell(kvAmount(sale.getShipping(), sale.getCurrency()));
            totals.addCell(kvBold("Grand Total"));
            totals.addCell(kvBoldAmount(sale.getGrandTotal(), sale.getCurrency()));
            totals.addCell(kvLabel("Paid"));
            totals.addCell(kvAmount(sale.getPaidTotal(), sale.getCurrency()));
            totals.addCell(kvBold("Due"));
            totals.addCell(kvBoldAmount(sale.getGrandTotal().subtract(sale.getPaidTotal()), sale.getCurrency()));
            doc.add(totals);

            if (sale.getNotes() != null && !sale.getNotes().isBlank()) {
                doc.add(Chunk.NEWLINE);
                doc.add(new Paragraph("Notes: " + sale.getNotes(), SMALL));
            }

            doc.add(Chunk.NEWLINE);
            Paragraph footer = new Paragraph("Thank you for your business.", SMALL);
            footer.setAlignment(Element.ALIGN_CENTER);
            doc.add(footer);
        } finally {
            doc.close();
        }
        return out.toByteArray();
    }

    // ---------- cell helpers ----------
    private static PdfPCell kv(String k, String v) {
        PdfPCell cell = new PdfPCell();
        cell.setBorder(Rectangle.NO_BORDER);
        Paragraph key = new Paragraph(k, SMALL);
        Paragraph val = new Paragraph(v == null ? "" : v, NORMAL);
        cell.addElement(key);
        cell.addElement(val);
        return cell;
    }
    private static PdfPCell th(String text) {
        PdfPCell c = new PdfPCell(new Phrase(text, H2));
        c.setBackgroundColor(new Color(245, 245, 245));
        c.setPadding(6);
        return c;
    }
    private static PdfPCell td(String text) {
        PdfPCell c = new PdfPCell(new Phrase(text, NORMAL));
        c.setPadding(5);
        return c;
    }
    private static PdfPCell kvLabel(String label)  { PdfPCell c = new PdfPCell(new Phrase(label, NORMAL)); c.setBorder(Rectangle.NO_BORDER); return c; }
    private static PdfPCell kvAmount(BigDecimal v, String cur) {
        PdfPCell c = new PdfPCell(new Phrase(v.toPlainString() + " " + cur, NORMAL));
        c.setBorder(Rectangle.NO_BORDER);
        c.setHorizontalAlignment(Element.ALIGN_RIGHT);
        return c;
    }
    private static PdfPCell kvBold(String label)  { PdfPCell c = new PdfPCell(new Phrase(label, H2)); c.setBorder(Rectangle.NO_BORDER); return c; }
    private static PdfPCell kvBoldAmount(BigDecimal v, String cur) {
        PdfPCell c = new PdfPCell(new Phrase(v.toPlainString() + " " + cur, H2));
        c.setBorder(Rectangle.NO_BORDER);
        c.setHorizontalAlignment(Element.ALIGN_RIGHT);
        return c;
    }
}
