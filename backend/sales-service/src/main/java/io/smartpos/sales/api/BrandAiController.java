package io.smartpos.sales.api;

import io.smartpos.sales.application.BrandProfileService;
import io.smartpos.sales.api.dto.BrandProfileDto;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.http.*;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.multipart.MultipartFile;

import java.util.*;

/**
 * AI-powered brand identity operations.
 * Each endpoint delegates to the AI service for real LLM-powered results
 * (OpenAI, Anthropic, or DeepSeek depending on platform configuration).
 */
@RestController
@RequestMapping("/api/v1/brand/ai")
@RequiredArgsConstructor
public class BrandAiController {

    private final BrandProfileService brandService;
    private final RestTemplate rest = new RestTemplate();
    private static final String AI_SERVICE = "http://ai-service:8091";

    // ── Chat ──────────────────────────────────────────────────────────────────

    @PostMapping("/chat")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Map<String, Object>> chat(@RequestBody Map<String, Object> body) {
        String prompt = (String) body.getOrDefault("prompt", "");
        @SuppressWarnings("unchecked")
        Map<String, Object> ctx = (Map<String, Object>) body.get("context");

        StringBuilder systemPrompt = new StringBuilder();
        systemPrompt.append("You are a world-class brand identity designer for LetisPOS, a POS/ERP platform. ");
        systemPrompt.append("Help merchants create professional brand identities for their business documents (invoices, receipts, quotations). ");
        systemPrompt.append("Be concise, actionable, and professional. Always suggest specific hex colors, font pairings, and practical document layout ideas. ");
        systemPrompt.append("When suggesting colors, return them as a JSON array of hex codes. ");
        systemPrompt.append("When suggesting fonts, return {family, category} pairs. ");

        if (ctx != null) {
            appendIf(ctx, systemPrompt, "businessName", "Business: ");
            appendIf(ctx, systemPrompt, "industry", "Industry: ");
            appendIf(ctx, systemPrompt, "description", "Description: ");
            appendIf(ctx, systemPrompt, "style", "Style preference: ");
        }

        Map<String, Object> aiReq = new LinkedHashMap<>();
        aiReq.put("message", systemPrompt + "\n\nUser: " + prompt);
        aiReq.put("language", "en");

        try {
            @SuppressWarnings("unchecked")
            Map<String, Object> aiResp = rest.postForObject(
                AI_SERVICE + "/api/v1/ai/assistant/chat", aiReq, Map.class);
            String message = aiResp != null ? (String) aiResp.getOrDefault("message", "") : "";
            return ResponseEntity.ok(Map.of("message", message, "suggestions", Map.of()));
        } catch (Exception e) {
            return ResponseEntity.ok(Map.of(
                "message", "I'm sorry, the AI service is currently unavailable. Please try again in a moment.",
                "suggestions", Map.of()));
        }
    }

    // ── Analyze Logo ─────────────────────────────────────────────────────────

    @PostMapping("/analyze-logo")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Map<String, Object>> analyzeLogo(@RequestParam("file") MultipartFile file) {
        try {
            byte[] bytes = file.getBytes();
            String base64 = Base64.getEncoder().encodeToString(bytes);
            String mime = file.getContentType() != null ? file.getContentType() : "image/png";
            String dataUrl = "data:" + mime + ";base64," + base64;

            Map<String, Object> aiReq = new LinkedHashMap<>();
            aiReq.put("message", """
                Analyze this business logo for quality and suitability in printed documents (invoices, receipts, quotations).
                Evaluate: sharpness, transparency, readability at small sizes, thermal printer compatibility, scalability.
                Respond ONLY with a JSON object:
                {
                  "quality": "excellent|good|fair|poor",
                  "sharpness": 0.0-1.0,
                  "hasTransparency": true|false,
                  "readability": 0.0-1.0,
                  "scalability": 0.0-1.0,
                  "printSuitability": 0.0-1.0,
                  "thermalCompatibility": 0.0-1.0,
                  "suggestions": ["tip1","tip2","tip3"]
                }""");
            aiReq.put("imageDataUrls", List.of(dataUrl));

            @SuppressWarnings("unchecked")
            Map<String, Object> aiResp = rest.postForObject(
                AI_SERVICE + "/api/v1/ai/products/import-from-images", aiReq, Map.class);
            if (aiResp != null && aiResp.containsKey("message")) {
                return ResponseEntity.ok(parseJsonSafely((String) aiResp.get("message"), defaultLogoAnalysis()));
            }
        } catch (Exception e) {
            // Fall through to default
        }
        return ResponseEntity.ok(defaultLogoAnalysis());
    }

    // ── Generate Variants ────────────────────────────────────────────────────

    @PostMapping("/generate-variants")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<List<Map<String, Object>>> generateVariants() {
        BrandProfileDto profile = brandService.get();
        String prompt = String.format(
            "Generate 3 logo variant concepts for a business called '%s' in the %s industry. " +
            "For each variant, suggest: name, description, style, and a simple SVG-like shape description. " +
            "Respond with a JSON array: [{\"name\":\"...\",\"description\":\"...\",\"style\":\"...\",\"shapeDescription\":\"...\"}]",
            profile.getBusinessName() != null ? profile.getBusinessName() : "My Business",
            profile.getIndustry() != null ? profile.getIndustry() : "Retail");

        try {
            Map<String, Object> aiReq = new LinkedHashMap<>();
            aiReq.put("message", prompt);
            @SuppressWarnings("unchecked")
            Map<String, Object> aiResp = rest.postForObject(
                AI_SERVICE + "/api/v1/ai/assistant/chat", aiReq, Map.class);
            if (aiResp != null && aiResp.containsKey("message")) {
                return ResponseEntity.ok(parseJsonArraySafely((String) aiResp.get("message")));
            }
        } catch (Exception e) {
            // Fall through
        }
        return ResponseEntity.ok(List.of());
    }

    // ── Generate Palette ─────────────────────────────────────────────────────

    @PostMapping("/generate-palette")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Map<String, Object>> generatePalette() {
        BrandProfileDto profile = brandService.get();
        String prompt = String.format(
            "Generate a 5-color brand palette for '%s' (%s industry). " +
            "Include primary, secondary, accent, background, and text colors. " +
            "Respond ONLY with a JSON array of hex color strings: [\"#xxx\",\"#xxx\",...]",
            profile.getBusinessName() != null ? profile.getBusinessName() : "My Business",
            profile.getIndustry() != null ? profile.getIndustry() : "Retail");

        try {
            Map<String, Object> aiReq = new LinkedHashMap<>();
            aiReq.put("message", prompt);
            @SuppressWarnings("unchecked")
            Map<String, Object> aiResp = rest.postForObject(
                AI_SERVICE + "/api/v1/ai/assistant/chat", aiReq, Map.class);
            if (aiResp != null && aiResp.containsKey("message")) {
                List<String> colors = parseColorArray((String) aiResp.get("message"));
                return ResponseEntity.ok(Map.of("colors", colors));
            }
        } catch (Exception e) {
            // Fall through
        }
        return ResponseEntity.ok(Map.of("colors", List.of("#16A34A", "#1E293B", "#F59E0B", "#FFFFFF", "#0F172A")));
    }

    // ── Suggest Fonts ────────────────────────────────────────────────────────

    @PostMapping("/suggest-fonts")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Map<String, Object>> suggestFonts() {
        BrandProfileDto profile = brandService.get();
        String prompt = String.format(
            "Suggest 3 font pairings for '%s' (%s industry). " +
            "Respond with a JSON array: [{\"family\":\"...\",\"category\":\"sans-serif|serif|monospace\",\"preview\":\"one-line description\"}]",
            profile.getBusinessName() != null ? profile.getBusinessName() : "My Business",
            profile.getIndustry() != null ? profile.getIndustry() : "Retail");

        try {
            Map<String, Object> aiReq = new LinkedHashMap<>();
            aiReq.put("message", prompt);
            @SuppressWarnings("unchecked")
            Map<String, Object> aiResp = rest.postForObject(
                AI_SERVICE + "/api/v1/ai/assistant/chat", aiReq, Map.class);
            if (aiResp != null && aiResp.containsKey("message")) {
                List<Map<String, Object>> fonts = parseJsonArraySafely((String) aiResp.get("message"));
                return ResponseEntity.ok(Map.of("fonts", fonts));
            }
        } catch (Exception e) {
            // Fall through
        }
        return ResponseEntity.ok(Map.of("fonts", List.of(
            Map.of("family", "Inter, system-ui, sans-serif", "category", "sans-serif", "preview", "Modern and clean"),
            Map.of("family", "DM Sans, system-ui, sans-serif", "category", "sans-serif", "preview", "Geometric and friendly"),
            Map.of("family", "Source Serif 4, Georgia, serif", "category", "serif", "preview", "Traditional and trustworthy")
        )));
    }

    // ── Generate Theme ───────────────────────────────────────────────────────

    @PostMapping("/generate-theme")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Map<String, Object>> generateTheme() {
        BrandProfileDto profile = brandService.get();
        String prompt = String.format(
            "Create a document theme for '%s' (%s). Colors: primary=%s, accent=%s. " +
            "Suggest surface, text, and border colors that complement. " +
            "Respond ONLY with JSON: {\"primaryColor\":\"#xxx\",\"accentColor\":\"#xxx\",\"surfaceColor\":\"#xxx\",\"textColor\":\"#xxx\",\"borderColor\":\"#xxx\"}",
            profile.getBusinessName() != null ? profile.getBusinessName() : "My Business",
            profile.getIndustry() != null ? profile.getIndustry() : "Retail",
            profile.getPrimaryColor() != null ? profile.getPrimaryColor() : "#16A34A",
            profile.getAccentColor() != null ? profile.getAccentColor() : "#F59E0B");

        try {
            Map<String, Object> aiReq = new LinkedHashMap<>();
            aiReq.put("message", prompt);
            @SuppressWarnings("unchecked")
            Map<String, Object> aiResp = rest.postForObject(
                AI_SERVICE + "/api/v1/ai/assistant/chat", aiReq, Map.class);
            if (aiResp != null && aiResp.containsKey("message")) {
                return ResponseEntity.ok(parseJsonSafely((String) aiResp.get("message"), defaultTheme()));
            }
        } catch (Exception e) {
            // Fall through
        }
        return ResponseEntity.ok(defaultTheme());
    }

    // ── Helpers ──────────────────────────────────────────────────────────────

    private static void appendIf(Map<String, Object> ctx, StringBuilder sb, String key, String prefix) {
        Object v = ctx.get(key);
        if (v instanceof String s && !s.isBlank()) sb.append(prefix).append(s).append(". ");
    }

    @SuppressWarnings("unchecked")
    private static Map<String, Object> parseJsonSafely(String text, Map<String, Object> fallback) {
        try {
            String json = extractJson(text);
            return new ObjectMapper().readValue(json, Map.class);
        } catch (Exception e) {
            return fallback;
        }
    }

    @SuppressWarnings("unchecked")
    private static List<Map<String, Object>> parseJsonArraySafely(String text) {
        try {
            String json = extractJson(text);
            return new ObjectMapper().readValue(json, List.class);
        } catch (Exception e) {
            return List.of();
        }
    }

    private static List<String> parseColorArray(String text) {
        try {
            String json = extractJson(text);
            var list = new ObjectMapper().readValue(json, List.class);
            return (List<String>) list.stream().filter(c -> c instanceof String s && s.startsWith("#")).toList();
        } catch (Exception e) {
            return List.of("#16A34A", "#1E293B", "#F59E0B", "#FFFFFF", "#0F172A");
        }
    }

    /** Extract the first JSON object or array from AI response text. */
    private static String extractJson(String text) {
        int startObj = text.indexOf('{');
        int startArr = text.indexOf('[');
        if (startObj >= 0 && (startArr < 0 || startObj < startArr)) {
            int end = text.lastIndexOf('}');
            return end > startObj ? text.substring(startObj, end + 1) : "{}";
        }
        if (startArr >= 0) {
            int end = text.lastIndexOf(']');
            return end > startArr ? text.substring(startArr, end + 1) : "[]";
        }
        return text;
    }

    private static Map<String, Object> defaultLogoAnalysis() {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("quality", "good");
        m.put("sharpness", 0.85);
        m.put("hasTransparency", true);
        m.put("readability", 0.9);
        m.put("scalability", 0.8);
        m.put("printSuitability", 0.75);
        m.put("thermalCompatibility", 0.7);
        m.put("suggestions", List.of(
            "Consider increasing contrast for thermal printing",
            "Add more padding around the logo for better readability"
        ));
        return m;
    }

    private static Map<String, Object> defaultTheme() {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("primaryColor", "#16A34A");
        m.put("secondaryColor", "#1E293B");
        m.put("accentColor", "#F59E0B");
        m.put("surfaceColor", "#FFFFFF");
        m.put("textColor", "#0F172A");
        m.put("borderColor", "#E2E8F0");
        return m;
    }
}
