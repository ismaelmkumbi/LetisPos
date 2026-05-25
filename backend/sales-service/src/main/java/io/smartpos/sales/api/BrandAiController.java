package io.smartpos.sales.api;

import io.smartpos.sales.application.BrandProfileService;
import io.smartpos.sales.api.dto.BrandProfileDto;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.http.*;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.multipart.MultipartFile;

import java.util.*;

/**
 * AI-powered brand identity operations.
 * Forwards the user's JWT to the AI service so auth checks pass.
 */
@RestController
@RequestMapping("/api/v1/brand/ai")
@RequiredArgsConstructor
public class BrandAiController {

    private final BrandProfileService brandService;
    private final RestTemplate rest = new RestTemplate();

    @org.springframework.beans.factory.annotation.Value("${smartpos.sales.ai-service-url:http://10.0.0.2:8091}")
    private String aiServiceUrl;

    private String aiChatUrl() { return aiServiceUrl + "/api/v1/ai/chat"; }

    /** Call AI service with the user's JWT forwarded. */
    private Map<String, Object> aiChat(String prompt, String systemPrompt, Jwt jwt) {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("prompt", prompt);
        body.put("systemPrompt", systemPrompt);

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        if (jwt != null) headers.setBearerAuth(jwt.getTokenValue());

        try {
            @SuppressWarnings("unchecked")
            var resp = rest.exchange(aiChatUrl(), HttpMethod.POST,
                new HttpEntity<>(body, headers), Map.class);
            return resp.getBody();
        } catch (Exception e) {
            return null;
        }
    }

    // ── Chat ──────────────────────────────────────────────────────────────────

    @PostMapping("/chat")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Map<String, Object>> chat(@RequestBody Map<String, Object> body,
                                                     @AuthenticationPrincipal Jwt jwt) {
        String prompt = (String) body.getOrDefault("prompt", "");
        @SuppressWarnings("unchecked")
        Map<String, Object> ctx = (Map<String, Object>) body.get("context");

        StringBuilder sysPrompt = new StringBuilder();
        sysPrompt.append("You are a world-class brand identity designer for LetisPOS. ");
        sysPrompt.append("Help merchants create professional brand identities for their business documents. ");
        sysPrompt.append("Be concise, actionable, and professional. Suggest specific hex colors, font pairings, and layout ideas. ");
        sysPrompt.append("When suggesting colors, return them as a JSON array of hex codes. ");
        sysPrompt.append("When suggesting fonts, return {family, category} pairs. ");

        if (ctx != null) {
            appendIf(ctx, sysPrompt, "businessName", "Business: ");
            appendIf(ctx, sysPrompt, "industry", "Industry: ");
            appendIf(ctx, sysPrompt, "description", "Description: ");
            appendIf(ctx, sysPrompt, "style", "Style preference: ");
        }

        Map<String, Object> aiResp = aiChat(prompt, sysPrompt.toString(), jwt);
        if (aiResp != null && aiResp.containsKey("narrative")) {
            return ResponseEntity.ok(Map.of("message", aiResp.get("narrative"), "suggestions", Map.of()));
        }
        return ResponseEntity.ok(Map.of(
            "message", "I'm sorry, the AI service is currently unavailable. Please try again in a moment.",
            "suggestions", Map.of()));
    }

    // ── Analyze Logo ─────────────────────────────────────────────────────────

    @PostMapping("/analyze-logo")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Map<String, Object>> analyzeLogo(@RequestParam("file") MultipartFile file) {
        // Logo analysis uses basic heuristics for now.
        // Full AI vision analysis can be added via a dedicated endpoint.
        try {
            byte[] bytes = file.getBytes();
            int sizeKb = bytes.length / 1024;
            String mime = file.getContentType() != null ? file.getContentType() : "";
            boolean hasTransparency = mime.contains("png") || mime.contains("webp");

            Map<String, Object> result = new LinkedHashMap<>();
            result.put("quality", sizeKb > 10 ? "good" : "fair");
            result.put("sharpness", sizeKb > 20 ? 0.85 : 0.65);
            result.put("hasTransparency", hasTransparency);
            result.put("readability", 0.8);
            result.put("scalability", hasTransparency ? 0.9 : 0.7);
            result.put("printSuitability", 0.75);
            result.put("thermalCompatibility", hasTransparency ? 0.6 : 0.8);
            result.put("suggestions", List.of(
                "For best results, use a PNG with transparent background",
                "Logo should be at least 500x500px for print quality",
                "Test logo on thermal printer before finalising"
            ));
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            return ResponseEntity.ok(defaultLogoAnalysis());
        }
    }

    // ── Generate Variants ────────────────────────────────────────────────────

    @PostMapping("/generate-variants")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<List<Map<String, Object>>> generateVariants(@AuthenticationPrincipal Jwt jwt) {
        BrandProfileDto profile = brandService.get();
        String prompt = String.format(
            "Generate 3 logo variant concepts for a business called '%s' in the %s industry. " +
            "For each variant, suggest: name, description, style, and a simple SVG-like shape description. " +
            "Respond with a JSON array.",
            profile.getBusinessName() != null ? profile.getBusinessName() : "My Business",
            profile.getIndustry() != null ? profile.getIndustry() : "Retail");

        Map<String, Object> aiResp = aiChat(prompt, "Respond ONLY with a JSON array of objects.", jwt);
        if (aiResp != null && aiResp.containsKey("narrative")) {
            return ResponseEntity.ok(parseJsonArraySafely((String) aiResp.get("narrative")));
        }
        return ResponseEntity.ok(List.of());
    }

    // ── Generate Palette ─────────────────────────────────────────────────────

    @PostMapping("/generate-palette")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Map<String, Object>> generatePalette(@AuthenticationPrincipal Jwt jwt) {
        BrandProfileDto profile = brandService.get();
        String prompt = String.format(
            "Generate a 5-color brand palette for '%s' (%s industry). " +
            "Respond ONLY with a JSON array of hex color strings.",
            profile.getBusinessName() != null ? profile.getBusinessName() : "My Business",
            profile.getIndustry() != null ? profile.getIndustry() : "Retail");

        Map<String, Object> aiResp = aiChat(prompt, "Respond ONLY with a JSON array of hex colors.", jwt);
        if (aiResp != null && aiResp.containsKey("narrative")) {
            return ResponseEntity.ok(Map.of("colors", parseColorArray((String) aiResp.get("narrative"))));
        }
        return ResponseEntity.ok(Map.of("colors", List.of("#16A34A", "#1E293B", "#F59E0B", "#FFFFFF", "#0F172A")));
    }

    // ── Suggest Fonts ────────────────────────────────────────────────────────

    @PostMapping("/suggest-fonts")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Map<String, Object>> suggestFonts(@AuthenticationPrincipal Jwt jwt) {
        BrandProfileDto profile = brandService.get();
        String prompt = String.format(
            "Suggest 3 font pairings for '%s' (%s industry). Respond with a JSON array.",
            profile.getBusinessName() != null ? profile.getBusinessName() : "My Business",
            profile.getIndustry() != null ? profile.getIndustry() : "Retail");

        Map<String, Object> aiResp = aiChat(prompt, "Respond ONLY with a JSON array of {family, category, preview} objects.", jwt);
        if (aiResp != null && aiResp.containsKey("narrative")) {
            return ResponseEntity.ok(Map.of("fonts", parseJsonArraySafely((String) aiResp.get("narrative"))));
        }
        return ResponseEntity.ok(Map.of("fonts", defaultFonts()));
    }

    // ── Generate Theme ───────────────────────────────────────────────────────

    @PostMapping("/generate-theme")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Map<String, Object>> generateTheme(@AuthenticationPrincipal Jwt jwt) {
        BrandProfileDto profile = brandService.get();
        String prompt = String.format(
            "Create a document theme for '%s' (%s). Current colors: primary=%s, accent=%s. " +
            "Suggest surface, text, and border colors. Respond ONLY with JSON.",
            profile.getBusinessName() != null ? profile.getBusinessName() : "My Business",
            profile.getIndustry() != null ? profile.getIndustry() : "Retail",
            profile.getPrimaryColor() != null ? profile.getPrimaryColor() : "#16A34A",
            profile.getAccentColor() != null ? profile.getAccentColor() : "#F59E0B");

        Map<String, Object> aiResp = aiChat(prompt, "Respond ONLY with a JSON object with color fields.", jwt);
        if (aiResp != null && aiResp.containsKey("narrative")) {
            return ResponseEntity.ok(parseJsonSafely((String) aiResp.get("narrative"), defaultTheme()));
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

    private static List<Map<String, Object>> defaultFonts() {
        return List.of(
            Map.of("family", "Inter, system-ui, sans-serif", "category", "sans-serif", "preview", "Modern and clean"),
            Map.of("family", "DM Sans, system-ui, sans-serif", "category", "sans-serif", "preview", "Geometric and friendly"),
            Map.of("family", "Source Serif 4, Georgia, serif", "category", "serif", "preview", "Traditional and trustworthy")
        );
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
