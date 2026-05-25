package io.smartpos.ai.application;

/**
 * Tool-execution failure with structured remediation context for the LLM.
 * The {@code code} identifies the failure class, {@code message} is the
 * short user-safe text, and {@code hint} is the next-best-action the
 * assistant should suggest.
 *
 * Codes:
 *   NO_WAREHOUSE   — tenant has no warehouses configured
 *   NOT_FOUND      — requested entity does not exist
 *   FORBIDDEN      — caller lacks required permission
 *   INVALID_ARG    — caller supplied bad / missing args
 *   UPSTREAM       — downstream service unavailable or 5xx
 *   UNAVAILABLE    — feature disabled for current plan/role
 */
public class ToolException extends RuntimeException {

    private final String code;
    private final String hint;

    public ToolException(String code, String message, String hint) {
        super(message);
        this.code = code;
        this.hint = hint;
    }

    public String code() { return code; }
    public String hint() { return hint; }

    public static ToolException classify(String toolName, Throwable cause) {
        String msg = cause.getMessage() != null ? cause.getMessage() : "Unknown error";
        String lower = msg.toLowerCase();
        if (lower.contains("warehouseid") && (lower.contains("missing") || lower.contains("required") || lower.contains("400"))) {
            return new ToolException("NO_WAREHOUSE",
                "Stock query needs a warehouse but none is set.",
                "Ask the user to pick a warehouse, or have an admin create one in Settings → Warehouses.");
        }
        if (lower.contains("403") || lower.contains("forbidden") || lower.contains("access denied")) {
            return new ToolException("FORBIDDEN",
                "You don't have permission to run that.",
                "This action needs a higher-privilege role (manager or owner). Ask your store admin.");
        }
        if (lower.contains("404") || lower.contains("not found")) {
            return new ToolException("NOT_FOUND",
                "That record does not exist.",
                "Search first to confirm the ID, name, or reference is correct.");
        }
        if (lower.contains("400") || lower.contains("bad request") || lower.contains("invalid")) {
            return new ToolException("INVALID_ARG",
                "The request was rejected as invalid.",
                "Double-check the required fields (dates, IDs, amounts) and try again.");
        }
        if (lower.contains("503") || lower.contains("502") || lower.contains("connection")
            || lower.contains("timeout") || lower.contains("timed out")) {
            return new ToolException("UPSTREAM",
                "A backend service is temporarily unreachable.",
                "Try again in a moment. If it keeps failing, an admin should check service health.");
        }
        return new ToolException("UPSTREAM", msg,
            "Please retry; if the issue continues, share the exact question with support.");
    }
}
