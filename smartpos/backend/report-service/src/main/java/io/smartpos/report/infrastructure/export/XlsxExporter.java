package io.smartpos.report.infrastructure.export;

import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.streaming.SXSSFWorkbook;
import org.springframework.stereotype.Component;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

/** XLSX via Apache POI streaming API — low-memory friendly for large reports. */
@Component
public class XlsxExporter {

    public byte[] render(String sheetName, List<String> headers, List<List<Object>> rows) {
        try (SXSSFWorkbook wb = new SXSSFWorkbook(200)) {     // 200 rows in memory
            Sheet sheet = wb.createSheet(sheetName);

            // Header row
            CellStyle head = wb.createCellStyle();
            Font bold = wb.createFont();
            bold.setBold(true);
            head.setFont(bold);
            head.setFillForegroundColor(IndexedColors.GREY_25_PERCENT.getIndex());
            head.setFillPattern(FillPatternType.SOLID_FOREGROUND);

            Row headerRow = sheet.createRow(0);
            for (int i = 0; i < headers.size(); i++) {
                Cell c = headerRow.createCell(i);
                c.setCellValue(headers.get(i));
                c.setCellStyle(head);
            }

            // Data rows
            int r = 1;
            for (List<Object> row : rows) {
                Row xr = sheet.createRow(r++);
                for (int i = 0; i < row.size(); i++) {
                    setCell(xr.createCell(i), row.get(i));
                }
            }

            ByteArrayOutputStream out = new ByteArrayOutputStream();
            wb.write(out);
            wb.dispose();
            return out.toByteArray();
        } catch (IOException e) {
            throw new RuntimeException("XLSX render failed", e);
        }
    }

    private static void setCell(Cell c, Object v) {
        if (v == null) { c.setBlank(); return; }
        if (v instanceof Number n)     c.setCellValue(n.doubleValue());
        else if (v instanceof BigDecimal b) c.setCellValue(b.doubleValue());
        else if (v instanceof Boolean b)    c.setCellValue(b);
        else if (v instanceof LocalDate d)  c.setCellValue(d.toString());
        else                                c.setCellValue(v.toString());
    }
}
