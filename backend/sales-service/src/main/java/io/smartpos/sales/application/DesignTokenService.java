package io.smartpos.sales.application;

import io.smartpos.common.context.TenantContext;
import io.smartpos.sales.domain.model.BrandProfile;
import io.smartpos.sales.domain.repository.BrandProfileRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;

import java.util.*;

/**
 * Compiles design tokens from a tenant's {@link BrandProfile} into a flat
 * map suitable for CSS variable injection, PDF rendering, email inlining,
 * and thermal receipt formatting.
 *
 * For MVP, tokens are derived from brand_profiles columns on the fly.
 * Custom overrides stored in {@code design_tokens} take precedence when present.
 */
@Service
@RequiredArgsConstructor
public class DesignTokenService {

    private final BrandProfileRepository brandRepo;

    private static final Map<String, String> DEFAULT_SEMANTIC = Map.of(
        "color.success", "#22C55E",
        "color.warning", "#F59E0B",
        "color.error",   "#EF4444",
        "color.info",    "#3B82F6"
    );

    private static final Map<String, String> DEFAULT_SURFACES = Map.of(
        "surface.page",       "#F8FAFC",
        "surface.card",       "#FFFFFF",
        "surface.header",     "{color.primary}",
        "surface.sidebar",    "#1E293B",
        "surface.hover",      "{color.primary-soft}",
        "surface.selected",   "rgba({color.primary},0.12)"
    );

    private static final Map<String, String> DEFAULT_TEXT = Map.of(
        "text.primary",   "#0F172A",
        "text.secondary", "#64748B",
        "text.inverse",   "#FFFFFF",
        "text.link",      "{color.primary}"
    );

    private static final Map<String, String> DEFAULT_BORDERS = Map.of(
        "border.default",  "#E2E8F0",
        "border.strong",   "#CBD5E1",
        "border.focus",    "{color.primary}"
    );

    private static final Map<String, String> DEFAULT_RADII = Map.of(
        "radius.sm", "4px",
        "radius.md", "8px",
        "radius.lg", "12px",
        "radius.xl", "16px"
    );

    /**
     * Returns all design tokens for the current tenant as a flat map
     * suitable for CSS custom properties or JSON serialization.
     */
    @Cacheable(value = "designTokens", key = "T(io.smartpos.common.context.TenantContext).require()")
    public Map<String, String> compileTokens() {
        UUID tenantId = TenantContext.require();
        BrandProfile bp = brandRepo.findByTenantId(tenantId).orElse(null);
        return compileFromProfile(bp);
    }

    /**
     * Returns compiled tokens as a {@code :root { ... }} CSS block.
     */
    public String toCss() {
        Map<String, String> tokens = compileTokens();
        StringBuilder css = new StringBuilder(":root {\n");
        tokens.forEach((path, value) ->
            css.append("  --bp-").append(path.replace('.', '-'))
               .append(": ").append(value).append(";\n"));
        css.append("}\n");
        return css.toString();
    }

    private Map<String, String> compileFromProfile(BrandProfile bp) {
        Map<String, String> out = new LinkedHashMap<>();

        String primary = bp != null && notBlank(bp.getPrimaryColor())
            ? bp.getPrimaryColor() : "#16A34A";
        String secondary = bp != null && notBlank(bp.getSecondaryColor())
            ? bp.getSecondaryColor() : "#1E293B";
        String accent = bp != null && notBlank(bp.getAccentColor())
            ? bp.getAccentColor() : "#16A34A";
        String fontFamily = bp != null && notBlank(bp.getFontFamily())
            ? bp.getFontFamily() : "Inter, system-ui, sans-serif";

        // Core palette
        out.put("color.primary", primary);
        out.put("color.primary-light", lighten(primary, 0.88));
        out.put("color.primary-dark", darken(primary, 0.12));
        out.put("color.primary-soft", alpha(primary, 0.08));
        out.put("color.primary-border", alpha(primary, 0.22));
        out.put("color.primary-contrast", contrastingText(primary));

        out.put("color.secondary", secondary);
        out.put("color.secondary-light", lighten(secondary, 0.90));

        out.put("color.accent", accent);
        out.put("color.accent-light", lighten(accent, 0.88));
        out.put("color.accent-dark", darken(accent, 0.12));
        out.put("color.accent-soft", alpha(accent, 0.08));

        // Semantic
        DEFAULT_SEMANTIC.forEach(out::put);
        // Light variants for each semantic color
        for (var entry : DEFAULT_SEMANTIC.entrySet()) {
            out.put(entry.getKey() + "-light", lighten(entry.getValue(), 0.88));
        }

        // Surfaces (resolve aliases)
        DEFAULT_SURFACES.forEach((k, v) -> out.put(k, resolve(v, out)));

        // Text
        DEFAULT_TEXT.forEach((k, v) -> out.put(k, resolve(v, out)));

        // Borders
        DEFAULT_BORDERS.forEach((k, v) -> out.put(k, resolve(v, out)));

        // Radii
        DEFAULT_RADII.forEach(out::put);

        // Typography
        out.put("font.body", fontFamily);
        out.put("font.heading", fontFamily);
        out.put("font.mono", "'JetBrains Mono', 'Fira Code', monospace");

        // Sizes
        out.put("font.size-xs", "0.75rem");
        out.put("font.size-sm", "0.875rem");
        out.put("font.size-base", "1rem");
        out.put("font.size-lg", "1.125rem");
        out.put("font.size-xl", "1.25rem");
        out.put("font.size-2xl", "1.5rem");
        out.put("font.size-3xl", "1.875rem");

        return out;
    }

    /** Resolve {@code {color.primary}} style aliases within values. */
    private String resolve(String value, Map<String, String> tokens) {
        if (value == null || !value.contains("{")) return value;
        String resolved = value;
        for (var entry : tokens.entrySet()) {
            resolved = resolved.replace("{" + entry.getKey() + "}", entry.getValue());
        }
        return resolved;
    }

    private boolean notBlank(String s) {
        return s != null && !s.isBlank();
    }

    // ── colour math (same as frontend computeColorTokens) ────────────────

    private String lighten(String hex, double amount) {
        int[] rgb = hexToRgb(hex);
        if (rgb == null) return hex;
        int r = Math.min(255, rgb[0] + (int) Math.round((255 - rgb[0]) * amount));
        int g = Math.min(255, rgb[1] + (int) Math.round((255 - rgb[1]) * amount));
        int b = Math.min(255, rgb[2] + (int) Math.round((255 - rgb[2]) * amount));
        return String.format("#%02X%02X%02X", r, g, b);
    }

    private String darken(String hex, double amount) {
        int[] rgb = hexToRgb(hex);
        if (rgb == null) return hex;
        int r = Math.max(0, (int) Math.round(rgb[0] * (1 - amount)));
        int g = Math.max(0, (int) Math.round(rgb[1] * (1 - amount)));
        int b = Math.max(0, (int) Math.round(rgb[2] * (1 - amount)));
        return String.format("#%02X%02X%02X", r, g, b);
    }

    private String alpha(String hex, double a) {
        int[] rgb = hexToRgb(hex);
        if (rgb == null) return hex;
        return String.format("rgba(%d,%d,%d,%.2f)", rgb[0], rgb[1], rgb[2], a);
    }

    /** WCAG relative luminance → choose white or dark text for contrast. */
    private String contrastingText(String hex) {
        int[] rgb = hexToRgb(hex);
        if (rgb == null) return "#FFFFFF";
        double lum = (0.299 * rgb[0] + 0.587 * rgb[1] + 0.114 * rgb[2]) / 255.0;
        return lum > 0.55 ? "#0F172A" : "#FFFFFF";
    }

    private int[] hexToRgb(String hex) {
        if (hex == null || hex.length() < 7) return null;
        try {
            return new int[]{
                Integer.parseInt(hex.substring(1, 3), 16),
                Integer.parseInt(hex.substring(3, 5), 16),
                Integer.parseInt(hex.substring(5, 7), 16)
            };
        } catch (NumberFormatException e) {
            return null;
        }
    }
}