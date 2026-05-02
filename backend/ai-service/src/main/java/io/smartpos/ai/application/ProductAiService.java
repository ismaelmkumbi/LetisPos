package io.smartpos.ai.application;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.smartpos.ai.api.dto.AiDtos;
import io.smartpos.ai.application.provider.AiProvider;
import io.smartpos.ai.application.provider.AiRouter;
import io.smartpos.ai.domain.model.AiInvocation;
import io.smartpos.ai.domain.repository.AiInvocationRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * AI-assisted product authoring:
 *
 *   suggest(name, context)        → one cleaned-up product proposal
 *   importMap(headers,rows,ctx)   → a list of mapped products with confidence
 *
 * The service builds compact, deterministic prompts and asks the active
 * provider for strict JSON. Output is parsed leniently (markdown fences are
 * stripped) and unrecognised IDs are nulled so the UI can ask the user.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class ProductAiService {

    private static final ObjectMapper MAPPER = new ObjectMapper();

    private static final String SYS_SUGGEST = """
            PRODUCT_SUGGEST
            You help a retail point-of-sale operator add a new product. Given a
            short product name and lists of existing categories, brands and units
            from the user's catalog, return ONE clean product proposal as a JSON
            object that matches this schema EXACTLY:

            {
              "name":              string,           // cleaned-up product name
              "description":       string|null,
              "categoryId":        uuid|null,        // pick from provided categories or null
              "brandId":           uuid|null,        // pick from provided brands or null
              "unitId":            uuid|null,        // pick from provided units or null
              "barcodeSymbology":  "CODE128"|"EAN13"|"EAN8"|"UPC"|"CODE39",
              "code":              string|null,      // a plausible product code or null
              "cost":              number|null,
              "price":             number|null,
              "wholesalePrice":    number|null,
              "minPrice":          number|null,
              "taxRate":           number|null,      // 0-100 (percent)
              "confidence":        number,           // 0.0 - 1.0
              "rationale":         string            // 1-2 short sentences
            }

            Rules:
              - Only use category/brand/unit IDs from the provided lists. If none
                fits, return null for that field — DO NOT invent UUIDs.
              - If you don't know a price, return null instead of guessing wildly.
              - Use the provided currency and default tax rate as a guide.
              - Output ONLY the JSON object — no commentary, no markdown.
            """;

    private static final String SYS_IMPORT = """
            PRODUCT_IMPORT_MAP
            You help a retail operator bulk-import products from a spreadsheet.
            Given a list of headers and parsed rows, return one mapped product per
            row as JSON matching this schema EXACTLY:

            {
              "rows": [
                {
                  "row":              int,           // original row index
                  "name":             string,
                  "description":      string|null,
                  "categoryId":       uuid|null,
                  "brandId":          uuid|null,
                  "unitId":           uuid|null,
                  "code":             string|null,
                  "barcodeSymbology": "CODE128"|"EAN13"|"EAN8"|"UPC"|"CODE39",
                  "cost":             number|null,
                  "price":            number|null,
                  "wholesalePrice":   number|null,
                  "minPrice":         number|null,
                  "taxRate":          number|null,
                  "confidence":       number,        // 0.0 - 1.0
                  "warnings":         string[]
                }
              ],
              "warnings": string[]                   // global notes (e.g. unrecognised columns)
            }

            Rules:
              - Only use category/brand/unit IDs from the provided lists. If none
                fits, return null AND add a warning like "category 'XYZ' not found".
              - Trim whitespace, parse numbers, infer obvious column meanings.
              - Skip blank rows — do not emit them.
              - Output ONLY the JSON object — no commentary, no markdown.
            """;

    private final AiRouter aiRouter;
    private final AiInvocationRepository invocations;

    // ── public ────────────────────────────────────────────────────────────

    public AiDtos.ProductSuggestion suggest(AiDtos.ProductSuggestRequest req, UUID userId) {
        String userPrompt = buildSuggestPrompt(req);
        AiProvider provider = aiRouter.active();
        long t0 = System.currentTimeMillis();
        AiProvider.Result result;
        String error = null;
        try {
            result = provider.completeJson(SYS_SUGGEST, userPrompt);
        } catch (Exception e) {
            error = e.getMessage();
            log.warn("AI provider {} failed: {}", provider.name(), error);
            result = new AiProvider.Result("{}", 0, 0);
        }
        int duration = (int) (System.currentTimeMillis() - t0);

        invocations.save(AiInvocation.builder()
                .kind("PRODUCT_SUGGEST").provider(provider.name()).model(provider.model())
                .promptTokens(result.promptTokens()).completionTokens(result.completionTokens())
                .inputSummary("suggest " + req.name())
                .output(truncate(result.text(), 4000)).error(error).userId(userId)
                .durationMs(duration).build());

        JsonNode root = parseJson(result.text());
        return new AiDtos.ProductSuggestion(
                str(root, "name", req.name()),
                str(root, "description", null),
                uuid(root, "categoryId"),
                uuid(root, "brandId"),
                uuid(root, "unitId"),
                str(root, "barcodeSymbology", "CODE128"),
                str(root, "code", null),
                bd(root, "cost"),
                bd(root, "price"),
                bd(root, "wholesalePrice"),
                bd(root, "minPrice"),
                bd(root, "taxRate"),
                num(root, "confidence", 0.0),
                str(root, "rationale", null),
                provider.name(),
                provider.model(),
                Instant.now()
        );
    }

    public AiDtos.ProductImportMapResponse importMap(AiDtos.ProductImportMapRequest req, UUID userId) {
        String userPrompt = buildImportPrompt(req);
        AiProvider provider = aiRouter.active();
        long t0 = System.currentTimeMillis();
        AiProvider.Result result;
        String error = null;
        try {
            result = provider.completeJson(SYS_IMPORT, userPrompt);
        } catch (Exception e) {
            error = e.getMessage();
            log.warn("AI provider {} failed: {}", provider.name(), error);
            result = new AiProvider.Result("{\"rows\":[],\"warnings\":[\"" + safe(error) + "\"]}", 0, 0);
        }
        int duration = (int) (System.currentTimeMillis() - t0);

        invocations.save(AiInvocation.builder()
                .kind("PRODUCT_IMPORT_MAP").provider(provider.name()).model(provider.model())
                .promptTokens(result.promptTokens()).completionTokens(result.completionTokens())
                .inputSummary("import-map " + req.rows().size() + " rows")
                .output(truncate(result.text(), 4000)).error(error).userId(userId)
                .durationMs(duration).build());

        JsonNode root = parseJson(result.text());
        List<AiDtos.MappedRow> mapped = new ArrayList<>();
        if (root.has("rows") && root.get("rows").isArray()) {
            for (JsonNode r : root.get("rows")) {
                List<String> warnings = new ArrayList<>();
                if (r.has("warnings") && r.get("warnings").isArray()) {
                    r.get("warnings").forEach(w -> warnings.add(w.asText()));
                }
                mapped.add(new AiDtos.MappedRow(
                        r.path("row").asInt(0),
                        str(r, "name", ""),
                        str(r, "description", null),
                        uuid(r, "categoryId"),
                        uuid(r, "brandId"),
                        uuid(r, "unitId"),
                        str(r, "code", null),
                        str(r, "barcodeSymbology", "CODE128"),
                        bd(r, "cost"),
                        bd(r, "price"),
                        bd(r, "wholesalePrice"),
                        bd(r, "minPrice"),
                        bd(r, "taxRate"),
                        num(r, "confidence", 0.0),
                        warnings
                ));
            }
        }
        List<String> globalWarnings = new ArrayList<>();
        if (root.has("warnings") && root.get("warnings").isArray()) {
            root.get("warnings").forEach(w -> globalWarnings.add(w.asText()));
        }
        return new AiDtos.ProductImportMapResponse(
                mapped, globalWarnings, provider.name(), provider.model(),
                result.promptTokens(), result.completionTokens(), Instant.now()
        );
    }

    // ── prompt builders ───────────────────────────────────────────────────

    private String buildSuggestPrompt(AiDtos.ProductSuggestRequest req) {
        StringBuilder sb = new StringBuilder();
        sb.append("Product name: ").append(req.name()).append('\n');
        if (req.hint() != null && !req.hint().isBlank()) {
            sb.append("Hint: ").append(req.hint()).append('\n');
        }
        appendContext(sb, req.context());
        return sb.toString();
    }

    private String buildImportPrompt(AiDtos.ProductImportMapRequest req) {
        StringBuilder sb = new StringBuilder();
        if (req.headers() != null) {
            sb.append("Headers: ").append(String.join(", ", req.headers())).append('\n');
        }
        sb.append("Row count: ").append(req.rows().size()).append('\n');
        appendContext(sb, req.context());
        sb.append("Rows (JSON):\n");
        try {
            sb.append(MAPPER.writeValueAsString(req.rows()));
        } catch (Exception e) {
            sb.append("[]");
        }
        return sb.toString();
    }

    private void appendContext(StringBuilder sb, AiDtos.WorkspaceContext ctx) {
        if (ctx == null) return;
        if (ctx.currency() != null)        sb.append("Currency: ").append(ctx.currency()).append('\n');
        if (ctx.defaultTaxRate() != null)  sb.append("Default tax rate: ").append(ctx.defaultTaxRate()).append("%\n");
        if (ctx.categories() != null)      sb.append("Categories: ").append(refsJson(ctx.categories())).append('\n');
        if (ctx.brands()     != null)      sb.append("Brands: ").append(refsJson(ctx.brands())).append('\n');
        if (ctx.units()      != null)      sb.append("Units: ").append(refsJson(ctx.units())).append('\n');
    }

    private String refsJson(List<AiDtos.NamedRef> refs) {
        try { return MAPPER.writeValueAsString(refs); } catch (Exception e) { return "[]"; }
    }

    // ── JSON parsing helpers ──────────────────────────────────────────────

    /** Strips ```json fences``` then parses; returns an empty object on failure. */
    private static JsonNode parseJson(String raw) {
        if (raw == null) return MAPPER.createObjectNode();
        String s = raw.trim();
        // Strip code fences if the model wrapped its output despite instructions.
        Pattern fence = Pattern.compile("```(?:json)?\\s*([\\s\\S]*?)```");
        Matcher m = fence.matcher(s);
        if (m.find()) s = m.group(1).trim();
        try {
            return MAPPER.readTree(s);
        } catch (Exception e) {
            log.warn("Failed to parse AI JSON: {}", e.getMessage());
            return MAPPER.createObjectNode();
        }
    }

    private static String str(JsonNode n, String k, String fallback) {
        if (n == null || !n.hasNonNull(k)) return fallback;
        String v = n.get(k).asText();
        return (v == null || v.isBlank() || "null".equalsIgnoreCase(v)) ? fallback : v;
    }
    private static UUID uuid(JsonNode n, String k) {
        String v = str(n, k, null);
        if (v == null) return null;
        try { return UUID.fromString(v); } catch (Exception e) { return null; }
    }
    private static BigDecimal bd(JsonNode n, String k) {
        if (n == null || !n.hasNonNull(k)) return null;
        try { return new BigDecimal(n.get(k).asText()); } catch (Exception e) { return null; }
    }
    private static Double num(JsonNode n, String k, double fallback) {
        if (n == null || !n.hasNonNull(k)) return fallback;
        return n.get(k).asDouble(fallback);
    }
    private static String truncate(String s, int max) {
        if (s == null) return null;
        return s.length() <= max ? s : s.substring(0, max) + "…";
    }
    private static String safe(String s) {
        return s == null ? "" : s.replace("\"", "'");
    }

    /** No-op reference so spot-bugs / IDE don't strip unused imports. */
    @SuppressWarnings("unused")
    private static final TypeReference<List<AiDtos.MappedRow>> KEEP_TYPEREF = new TypeReference<>() {};
}
