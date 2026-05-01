package io.smartpos.report.infrastructure.export;

import org.springframework.stereotype.Component;

import java.util.List;

/** Minimal RFC 4180 CSV writer. No external deps, UTF-8, quotes fields with commas/quotes/newlines. */
@Component
public class CsvExporter {

    public byte[] render(List<String> headers, List<List<Object>> rows) {
        StringBuilder sb = new StringBuilder();
        writeRow(sb, headers.stream().map(o -> (Object) o).toList());
        for (List<Object> row : rows) writeRow(sb, row);
        return sb.toString().getBytes(java.nio.charset.StandardCharsets.UTF_8);
    }

    private static void writeRow(StringBuilder sb, List<Object> row) {
        for (int i = 0; i < row.size(); i++) {
            if (i > 0) sb.append(',');
            sb.append(escape(row.get(i)));
        }
        sb.append("\r\n");
    }

    private static String escape(Object v) {
        if (v == null) return "";
        String s = v.toString();
        boolean needsQuote = s.indexOf(',') >= 0 || s.indexOf('"') >= 0
                || s.indexOf('\n') >= 0 || s.indexOf('\r') >= 0;
        if (!needsQuote) return s;
        return "\"" + s.replace("\"", "\"\"") + "\"";
    }
}
