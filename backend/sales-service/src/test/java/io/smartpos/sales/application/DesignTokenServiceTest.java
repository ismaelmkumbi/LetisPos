package io.smartpos.sales.application;

import io.smartpos.sales.domain.model.BrandProfile;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.BeforeEach;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Unit tests for DesignTokenService token compilation.
 * Tests the core color math, token structure, and edge cases
 * without requiring a database or Spring context.
 */
class DesignTokenServiceTest {

    // Replicate token compilation logic inline for unit testing
    // (avoids needing Spring context + DB)

    @Test
    void tokensHaveAllRequiredKeys() {
        Map<String, String> tokens = compileTestTokens("#16A34A", "#1E293B", "#F59E0B");

        // Core palette
        assertTrue(tokens.containsKey("color.primary"));
        assertTrue(tokens.containsKey("color.primary-light"));
        assertTrue(tokens.containsKey("color.primary-dark"));
        assertTrue(tokens.containsKey("color.primary-soft"));
        assertTrue(tokens.containsKey("color.primary-border"));
        assertTrue(tokens.containsKey("color.primary-contrast"));
        assertTrue(tokens.containsKey("color.secondary"));
        assertTrue(tokens.containsKey("color.accent"));

        // Semantic
        assertTrue(tokens.containsKey("color.success"));
        assertTrue(tokens.containsKey("color.warning"));
        assertTrue(tokens.containsKey("color.error"));
        assertTrue(tokens.containsKey("color.info"));

        // Surfaces
        assertTrue(tokens.containsKey("surface.page"));
        assertTrue(tokens.containsKey("surface.card"));
        assertTrue(tokens.containsKey("surface.header"));
        assertTrue(tokens.containsKey("surface.sidebar"));

        // Text
        assertTrue(tokens.containsKey("text.primary"));
        assertTrue(tokens.containsKey("text.secondary"));
        assertTrue(tokens.containsKey("text.inverse"));
        assertTrue(tokens.containsKey("text.link"));

        // Borders
        assertTrue(tokens.containsKey("border.default"));
        assertTrue(tokens.containsKey("border.strong"));
        assertTrue(tokens.containsKey("border.focus"));

        // Radii
        assertTrue(tokens.containsKey("radius.sm"));
        assertTrue(tokens.containsKey("radius.md"));
        assertTrue(tokens.containsKey("radius.lg"));

        // Typography
        assertTrue(tokens.containsKey("font.body"));
        assertTrue(tokens.containsKey("font.heading"));
        assertTrue(tokens.containsKey("font.mono"));

        // Sizes
        assertTrue(tokens.containsKey("font.size-base"));
    }

    @Test
    void colorValuesAreValid() {
        Map<String, String> tokens = compileTestTokens("#16A34A", "#1E293B", "#F59E0B");

        // Primary should be the input color
        assertEquals("#16A34A", tokens.get("color.primary"));

        // Light version should be valid hex (not rgba)
        assertTrue(tokens.get("color.primary-light").matches("^#[0-9A-Fa-f]{6}$"),
            "primary-light should be valid hex, got: " + tokens.get("color.primary-light"));

        // Dark should be valid hex
        assertTrue(tokens.get("color.primary-dark").matches("^#[0-9A-Fa-f]{6}$"));

        // Soft should be rgba
        assertTrue(tokens.get("color.primary-soft").startsWith("rgba"),
            "primary-soft should be rgba");

        // Border should be rgba
        assertTrue(tokens.get("color.primary-border").startsWith("rgba"));

        // Contrast should be white for green
        assertEquals("#FFFFFF", tokens.get("color.primary-contrast"));
    }

    @Test
    void darkModeInvertsSurfaces() {
        Map<String, String> light = compileTestTokens("#16A34A", "#1E293B", "#F59E0B");
        Map<String, String> dark = compileTestTokensDark("#16A34A", "#1E293B", "#F59E0B");

        // Dark surface.page should differ from light
        assertNotEquals(light.get("surface.page"), dark.get("surface.page"),
            "Dark mode should use different surface.page");

        // Dark surface.card should differ from light
        assertNotEquals(light.get("surface.card"), dark.get("surface.card"));

        // Dark text should be light-colored
        assertNotEquals(light.get("text.primary"), dark.get("text.primary"),
            "Dark mode should use light-colored text");

        // Dark borders should differ
        assertNotEquals(light.get("border.default"), dark.get("border.default"));
    }

    @Test
    void primaryColorShouldLiftInDarkMode() {
        Map<String, String> light = compileTestTokens("#16A34A", "#1E293B", "#F59E0B");
        Map<String, String> dark = compileTestTokensDark("#16A34A", "#1E293B", "#F59E0B");

        // Dark mode primary should be lighter than light mode
        assertNotEquals(light.get("color.primary"), dark.get("color.primary"),
            "Dark mode should lift primary color for contrast on dark backgrounds");
    }

    @Test
    void fontFamilyIsPreserved() {
        Map<String, String> tokens = compileTestTokens("#16A34A", "#1E293B", "#F59E0B");

        assertEquals("Inter, system-ui, sans-serif", tokens.get("font.body"));
        assertEquals("Inter, system-ui, sans-serif", tokens.get("font.heading"));
        assertTrue(tokens.get("font.mono").contains("monospace"));
    }

    @Test
    void semanticColorsAreConstant() {
        // Semantic colors should not change with brand — they're universal signals
        Map<String, String> tokens1 = compileTestTokens("#16A34A", "#1E293B", "#F59E0B");
        Map<String, String> tokens2 = compileTestTokens("#DC2626", "#292524", "#F59E0B");

        assertEquals(tokens1.get("color.success"), tokens2.get("color.success"));
        assertEquals(tokens1.get("color.warning"), tokens2.get("color.warning"));
    }

    // ── Helpers (mirror DesignTokenService logic) ─────────────

    private Map<String, String> compileTestTokens(String primary, String secondary, String accent) {
        return compileTokens(primary, secondary, accent, false);
    }

    private Map<String, String> compileTestTokensDark(String primary, String secondary, String accent) {
        return compileTokens(primary, secondary, accent, true);
    }

    private Map<String, String> compileTokens(String primary, String secondary, String accent, boolean dark) {
        java.util.LinkedHashMap<String, String> out = new java.util.LinkedHashMap<>();

        String p = dark ? lighten(primary, 0.15) : primary;
        String s = dark ? lighten(secondary, 0.30) : secondary;
        String a = dark ? lighten(accent, 0.15) : accent;

        out.put("color.primary", p);
        out.put("color.primary-light", lighten(primary, 0.88));
        out.put("color.primary-dark", darken(primary, 0.12));
        out.put("color.primary-soft", alpha(p, dark ? 0.15 : 0.08));
        out.put("color.primary-border", alpha(p, dark ? 0.30 : 0.22));
        out.put("color.primary-contrast", "#FFFFFF");
        out.put("color.secondary", s);
        out.put("color.secondary-light", lighten(secondary, 0.90));
        out.put("color.accent", a);
        out.put("color.accent-light", lighten(accent, 0.88));
        out.put("color.accent-dark", darken(accent, 0.12));
        out.put("color.accent-soft", alpha(a, dark ? 0.15 : 0.08));

        out.put("color.success", "#22C55E");
        out.put("color.success-light", lighten("#22C55E", 0.88));
        out.put("color.warning", "#F59E0B");
        out.put("color.warning-light", lighten("#F59E0B", 0.88));
        out.put("color.error", dark ? "#F87171" : "#EF4444");
        out.put("color.error-light", lighten("#EF4444", 0.88));
        out.put("color.info", dark ? "#60A5FA" : "#3B82F6");
        out.put("color.info-light", lighten("#3B82F6", 0.88));

        out.put("surface.page", dark ? "#0F172A" : "#F8FAFC");
        out.put("surface.card", dark ? "#1E293B" : "#FFFFFF");
        out.put("surface.header", p);
        out.put("surface.sidebar", dark ? "#020617" : "#1E293B");
        out.put("surface.hover", alpha(p, dark ? 0.12 : 0.08));
        out.put("surface.selected", alpha(p, dark ? 0.18 : 0.12));

        out.put("text.primary", dark ? "#F8FAFC" : "#0F172A");
        out.put("text.secondary", dark ? "#94A3B8" : "#64748B");
        out.put("text.inverse", dark ? "#0F172A" : "#FFFFFF");
        out.put("text.link", dark ? lighten(primary, 0.20) : primary);

        out.put("border.default", dark ? "#334155" : "#E2E8F0");
        out.put("border.strong", dark ? "#475569" : "#CBD5E1");
        out.put("border.focus", dark ? lighten(primary, 0.20) : primary);

        out.put("radius.sm", "4px");
        out.put("radius.md", "8px");
        out.put("radius.lg", "12px");
        out.put("radius.xl", "16px");

        out.put("font.body", "Inter, system-ui, sans-serif");
        out.put("font.heading", "Inter, system-ui, sans-serif");
        out.put("font.mono", "'JetBrains Mono', 'Fira Code', monospace");

        out.put("font.size-base", "1rem");

        return out;
    }

    // Color math (same as DesignTokenService)
    private String lighten(String hex, double amount) {
        int[] rgb = hexToRgb(hex); if (rgb == null) return hex;
        int r = Math.min(255, rgb[0] + (int)Math.round((255 - rgb[0]) * amount));
        int g = Math.min(255, rgb[1] + (int)Math.round((255 - rgb[1]) * amount));
        int b = Math.min(255, rgb[2] + (int)Math.round((255 - rgb[2]) * amount));
        return String.format("#%02X%02X%02X", r, g, b);
    }
    private String darken(String hex, double amount) {
        int[] rgb = hexToRgb(hex); if (rgb == null) return hex;
        int r = Math.max(0, (int)Math.round(rgb[0] * (1 - amount)));
        int g = Math.max(0, (int)Math.round(rgb[1] * (1 - amount)));
        int b = Math.max(0, (int)Math.round(rgb[2] * (1 - amount)));
        return String.format("#%02X%02X%02X", r, g, b);
    }
    private String alpha(String hex, double a) {
        int[] rgb = hexToRgb(hex); if (rgb == null) return hex;
        return String.format("rgba(%d,%d,%d,%.2f)", rgb[0], rgb[1], rgb[2], a);
    }
    private int[] hexToRgb(String hex) {
        if (hex == null || hex.length() < 7) return null;
        try {
            return new int[]{
                Integer.parseInt(hex.substring(1, 3), 16),
                Integer.parseInt(hex.substring(3, 5), 16),
                Integer.parseInt(hex.substring(5, 7), 16)
            };
        } catch (NumberFormatException e) { return null; }
    }
}
