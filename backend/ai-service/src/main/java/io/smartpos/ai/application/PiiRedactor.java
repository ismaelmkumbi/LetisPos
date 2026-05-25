package io.smartpos.ai.application;

import java.util.regex.Pattern;

/**
 * Best-effort redaction for user prompts and assistant outputs before they
 * land in the {@code AiInvocation} audit log. Aim is to avoid leaking PII
 * (emails, phone numbers, credit cards, national IDs) into a table that
 * support engineers can read.
 *
 * This is defence-in-depth, not a substitute for proper access control on
 * the log table itself.
 */
public final class PiiRedactor {

    private static final Pattern EMAIL = Pattern.compile(
        "[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}");

    // Matches +255712345678, 0712345678, 712 345 678 etc. — 9+ digits with optional + and separators
    private static final Pattern PHONE = Pattern.compile(
        "(?:\\+?\\d[\\d\\s\\-]{8,}\\d)");

    // 13–19 digit groups, common card lengths
    private static final Pattern CARD = Pattern.compile(
        "\\b(?:\\d[ -]*?){13,19}\\b");

    private PiiRedactor() {}

    public static String redact(String input) {
        if (input == null || input.isBlank()) return input;
        String out = input;
        out = CARD.matcher(out).replaceAll("[CARD]");
        out = EMAIL.matcher(out).replaceAll("[EMAIL]");
        out = PHONE.matcher(out).replaceAll("[PHONE]");
        return out;
    }
}
