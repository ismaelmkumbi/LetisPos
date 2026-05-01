package io.smartpos.ai.application.provider;

import org.springframework.stereotype.Component;

/**
 * Deterministic fallback used when no API key is configured.
 *
 * For text endpoints it returns a friendly message; for JSON endpoints it
 * recognises the SmartPOS prompt headers and returns a plausible structured
 * payload so the UI can be exercised end-to-end without a paid API call.
 */
@Component
public class StubProvider implements AiProvider {

    @Override public String name()  { return "stub"; }
    @Override public String model() { return "stub-1"; }

    @Override
    public Result complete(String systemPrompt, String userPrompt) {
        String text = "AI provider not configured. Set AI_PROVIDER=anthropic and ANTHROPIC_API_KEY (or AI_PROVIDER=openai and OPENAI_API_KEY) to receive real insights.\n\n"
                + "[ECHO]\nuser: " + (userPrompt == null ? "" : userPrompt.substring(0, Math.min(200, userPrompt.length())));
        return new Result(text, 0, 0);
    }

    @Override
    public Result completeJson(String systemPrompt, String userPrompt) {
        String sys = systemPrompt == null ? "" : systemPrompt;
        String user = userPrompt == null ? "" : userPrompt;

        if (sys.contains("PRODUCT_SUGGEST")) {
            // Echo back the typed name so devs see the round-trip working.
            String name = extractAfter(user, "Product name:").trim();
            if (name.isEmpty()) name = "Sample product";
            String json = """
                {
                  "name": %s,
                  "description": "AI-suggested item (stub)",
                  "categoryId": null,
                  "brandId": null,
                  "unitId": null,
                  "barcodeSymbology": "CODE128",
                  "code": null,
                  "cost": 0,
                  "price": 0,
                  "wholesalePrice": null,
                  "minPrice": null,
                  "taxRate": 0,
                  "confidence": 0.0,
                  "rationale": "Stub provider — configure OPENAI_API_KEY for real suggestions."
                }
                """.formatted(jsonString(name));
            return new Result(json, 0, 0);
        }

        if (sys.contains("PRODUCT_IMPORT_MAP")) {
            return new Result("{\"rows\":[],\"warnings\":[\"Stub provider — configure OPENAI_API_KEY to enable AI mapping.\"]}", 0, 0);
        }

        return new Result("{}", 0, 0);
    }

    private static String extractAfter(String haystack, String needle) {
        int idx = haystack.indexOf(needle);
        if (idx < 0) return "";
        int end = haystack.indexOf('\n', idx);
        return haystack.substring(idx + needle.length(), end < 0 ? haystack.length() : end);
    }

    private static String jsonString(String s) {
        return "\"" + s.replace("\\", "\\\\").replace("\"", "\\\"") + "\"";
    }
}
