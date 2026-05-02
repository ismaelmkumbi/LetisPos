package io.smartpos.report.infrastructure.export;

import com.lowagie.text.*;
import com.lowagie.text.pdf.PdfPCell;
import com.lowagie.text.pdf.PdfPTable;
import com.lowagie.text.pdf.PdfWriter;
import org.springframework.stereotype.Component;

import java.awt.Color;
import java.io.ByteArrayOutputStream;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;

/** Lightweight tabular-report PDF. For the invoice format see sales-service InvoicePdfGenerator. */
@Component
public class PdfExporter {

    private static final Font H1     = new Font(Font.HELVETICA, 16, Font.BOLD);
    private static final Font H2     = new Font(Font.HELVETICA, 10, Font.BOLD);
    private static final Font NORMAL = new Font(Font.HELVETICA,  9, Font.NORMAL);
    private static final Font SMALL  = new Font(Font.HELVETICA,  8, Font.NORMAL);

    public byte[] render(String title, String subtitle,
                         List<String> headers, List<List<Object>> rows) {
        Document doc = new Document(PageSize.A4.rotate(), 36, 36, 36, 36);
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        PdfWriter.getInstance(doc, out);
        doc.open();
        try {
            Paragraph t = new Paragraph(title, H1);
            doc.add(t);
            if (subtitle != null && !subtitle.isBlank()) {
                doc.add(new Paragraph(subtitle, SMALL));
            }
            doc.add(new Paragraph("Generated " + LocalDateTime.now().format(DateTimeFormatter.ISO_LOCAL_DATE_TIME), SMALL));
            doc.add(Chunk.NEWLINE);

            PdfPTable table = new PdfPTable(headers.size());
            table.setWidthPercentage(100);
            for (String h : headers) {
                PdfPCell cell = new PdfPCell(new Phrase(h, H2));
                cell.setBackgroundColor(new Color(235, 235, 235));
                cell.setPadding(5);
                table.addCell(cell);
            }
            for (List<Object> row : rows) {
                for (Object cell : row) {
                    PdfPCell c = new PdfPCell(new Phrase(cell == null ? "" : cell.toString(), NORMAL));
                    c.setPadding(4);
                    table.addCell(c);
                }
            }
            doc.add(table);
        } finally {
            doc.close();
        }
        return out.toByteArray();
    }
}
