package io.smartpos.sales.api;

import lombok.RequiredArgsConstructor;
import org.springframework.http.*;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestTemplate;

import java.util.Map;

@RestController
@RequestMapping("/api/v1/brand/ai")
@RequiredArgsConstructor
public class BrandAiController {

    private final RestTemplate restTemplate = new RestTemplate();

    private static final String AI_SERVICE_URL = "http://ai-service:8091";

    @PostMapping("/chat")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Map<String, Object>> chat(@RequestBody Map<String, Object> body) {
        String prompt = (String) body.getOrDefault("prompt", "");
        @SuppressWarnings("unchecked")
        Map<String, Object> context = (Map<String, Object>) body.get("context");

        StringBuilder fullPrompt = new StringBuilder();
        fullPrompt.append("You are a professional brand identity designer for a POS/ERP platform called LetisPOS. ");
        fullPrompt.append("Help the user with their brand identity — colors, logos, typography, document themes. ");
        fullPrompt.append("Be concise, actionable, and professional. Suggest specific hex colors, font pairings, and layout ideas. ");

        if (context != null) {
            String businessName = (String) context.get("businessName");
            String industry = (String) context.get("industry");
            String description = (String) context.get("description");
            String style = (String) context.get("style");
            if (businessName != null && !businessName.isEmpty())
                fullPrompt.append("Business: ").append(businessName).append(". ");
            if (industry != null && !industry.isEmpty())
                fullPrompt.append("Industry: ").append(industry).append(". ");
            if (description != null && !description.isEmpty())
                fullPrompt.append("Description: ").append(description).append(". ");
            if (style != null && !style.isEmpty())
                fullPrompt.append("Style: ").append(style).append(". ");
        }

        fullPrompt.append("User request: ").append(prompt);

        Map<String, Object> aiRequest = Map.of(
            "prompt", fullPrompt.toString(),
            "responseFormat", "json"
        );

        try {
            ResponseEntity<Map> aiResponse = restTemplate.postForEntity(
                AI_SERVICE_URL + "/api/v1/ai/chat",
                aiRequest,
                Map.class
            );

            @SuppressWarnings("unchecked")
            Map<String, Object> aiBody = aiResponse.getBody();
            String message = aiBody != null ? (String) aiBody.getOrDefault("message", "") : "";

            return ResponseEntity.ok(Map.of(
                "message", message,
                "suggestions", Map.of()
            ));
        } catch (Exception e) {
            return ResponseEntity.ok(Map.of(
                "message", "I'm sorry, I couldn't process that right now. The AI service might be warming up. Please try again in a moment.",
                "suggestions", Map.of()
            ));
        }
    }

    @PostMapping("/analyze-logo")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Map<String, Object>> analyzeLogo() {
        return ResponseEntity.ok(Map.of(
            "quality", "good",
            "sharpness", 0.85,
            "hasTransparency", true,
            "readability", 0.9,
            "scalability", 0.8,
            "printSuitability", 0.75,
            "thermalCompatibility", 0.7,
            "suggestions", java.util.List.of(
                "Consider increasing contrast for thermal printing",
                "Add more padding around the logo for better readability"
            )
        ));
    }

    @PostMapping("/generate-variants")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<java.util.List<Map<String, Object>>> generateVariants() {
        return ResponseEntity.ok(java.util.List.of());
    }

    @PostMapping("/generate-palette")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Map<String, Object>> generatePalette() {
        return ResponseEntity.ok(Map.of(
            "colors", java.util.List.of("#16A34A", "#1E293B", "#F59E0B", "#3B82F6", "#8B5CF6")
        ));
    }

    @PostMapping("/suggest-fonts")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Map<String, Object>> suggestFonts() {
        return ResponseEntity.ok(Map.of(
            "fonts", java.util.List.of(
                Map.of("family", "Inter, system-ui, sans-serif", "category", "sans-serif", "preview", "Modern and clean"),
                Map.of("family", "DM Sans, system-ui, sans-serif", "category", "sans-serif", "preview", "Geometric and friendly"),
                Map.of("family", "Source Serif 4, Georgia, serif", "category", "serif", "preview", "Traditional and trustworthy")
            )
        ));
    }

    @PostMapping("/generate-theme")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Map<String, Object>> generateTheme() {
        return ResponseEntity.ok(Map.of(
            "primaryColor", "#16A34A",
            "secondaryColor", "#1E293B",
            "accentColor", "#F59E0B",
            "surfaceColor", "#FFFFFF",
            "textColor", "#0F172A",
            "borderColor", "#E2E8F0"
        ));
    }
}
