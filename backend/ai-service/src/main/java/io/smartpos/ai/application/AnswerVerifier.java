package io.smartpos.ai.application;

import com.fasterxml.jackson.databind.ObjectMapper;
import io.smartpos.ai.api.dto.AssistantDtos;

import java.util.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Cheap, deterministic post-synthesis check: scan the assistant's final
 * answer for numbers (currency-formatted, percentages, integers) and
 * verify each one appears in the tool-output JSON.
 *
 * Returns a {@link Verdict} so callers can:
 *   - log drift for telemetry,
 *   - downgrade the answer (e.g. append a "verify these figures" note), or
 *   - in strict mode, refuse and re-synthesise.
 *
 * Designed to be conservative: we tolerate small formatting differences
 * (commas, decimal places, currency symbols) and skip tiny numbers (years,
 * limits like "5"/"10") to avoid false positives on prose like
 * "the top 5 customers".
 */
public final class AnswerVerifier {

    private static final Pattern NUMBER = Pattern.compile(
        "(?<![A-Za-z0-9_])[+-]?\\d{1,3}(?:,\\d{3})+(?:\\.\\d+)?|" +  // 1,234,567.89
        "(?<![A-Za-z0-9_])[+-]?\\d+\\.\\d+|" +                       // 12.5
        "(?<![A-Za-z0-9_])\\d{3,}"                                    // 4-digit+ raw
    );

    private static final int MIN_INTERESTING = 100;
    private static final ObjectMapper OM = new ObjectMapper();

    public record Verdict(
        boolean grounded,
        List<String> unverifiedNumbers,
        int totalNumbers
    ) {
        public double groundingScore() {
            if (totalNumbers == 0) return 1.0;
            return 1.0 - ((double) unverifiedNumbers.size() / totalNumbers);
        }
    }

    private AnswerVerifier() {}

    public static Verdict verify(String answer,
                                 List<AssistantDtos.ToolResult> toolResults) {
        if (answer == null || answer.isBlank()) {
            return new Verdict(true, List.of(), 0);
        }
        String haystack = serializeResults(toolResults);
        if (haystack.isBlank()) {
            return new Verdict(true, List.of(), 0);
        }

        Set<String> haystackTokens = numericTokens(haystack);
        List<String> unverified = new ArrayList<>();
        int total = 0;

        Matcher m = NUMBER.matcher(answer);
        while (m.find()) {
            String raw = m.group();
            double v;
            try {
                v = Double.parseDouble(raw.replace(",", ""));
            } catch (NumberFormatException e) {
                continue;
            }
            if (Math.abs(v) < MIN_INTERESTING) continue;
            total++;

            if (!matchesAny(raw, v, haystackTokens, haystack)) {
                unverified.add(raw);
            }
        }
        return new Verdict(unverified.isEmpty(), unverified, total);
    }

    private static boolean matchesAny(String raw, double v,
                                      Set<String> tokens, String haystack) {
        // Try several normalised forms
        String noCommas = raw.replace(",", "");
        if (tokens.contains(noCommas)) return true;
        if (tokens.contains(raw)) return true;
        // Drop trailing .0
        if (noCommas.endsWith(".0") && tokens.contains(noCommas.substring(0, noCommas.length() - 2))) return true;
        // Integer truncation of decimal
        long asLong = (long) v;
        if (tokens.contains(String.valueOf(asLong))) return true;
        // Substring fallback (very permissive — catches things like "1,500,000" in nested text)
        return haystack.contains(noCommas);
    }

    private static Set<String> numericTokens(String s) {
        Set<String> out = new HashSet<>();
        Matcher m = NUMBER.matcher(s);
        while (m.find()) {
            String raw = m.group();
            out.add(raw);
            out.add(raw.replace(",", ""));
            try {
                long asLong = Long.parseLong(raw.replace(",", "").split("\\.")[0]);
                out.add(String.valueOf(asLong));
            } catch (NumberFormatException ignored) {}
        }
        return out;
    }

    private static String serializeResults(List<AssistantDtos.ToolResult> results) {
        if (results == null || results.isEmpty()) return "";
        try {
            return OM.writeValueAsString(results);
        } catch (Exception e) {
            return String.valueOf(results);
        }
    }
}
