package io.smartpos.sales.api;

import io.smartpos.sales.application.DesignTokenService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.CacheControl;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.LinkedHashMap;
import java.util.Map;
import java.util.concurrent.TimeUnit;

/**
 * Exposes compiled design tokens as JSON (for mobile / API consumers),
 * CSS (for web injection and PDF rendering), and mobile-optimized config.
 * Includes CDN-friendly cache headers for production scaling.
 */
@RestController
@RequestMapping("/api/v1/brand/tokens")
@RequiredArgsConstructor
public class BrandTokenController {

    private final DesignTokenService tokenService;

    /** CDN cache: 5 min browser, 10 min CDN with stale-while-revalidate */
    private static final CacheControl CDN_CACHE = CacheControl.maxAge(300, TimeUnit.SECONDS)
        .cachePublic()
        .staleWhileRevalidate(600, TimeUnit.SECONDS);

    @GetMapping(produces = MediaType.APPLICATION_JSON_VALUE)
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Map<String, String>> getJson() {
        return ResponseEntity.ok()
            .cacheControl(CDN_CACHE)
            .body(tokenService.compileTokens());
    }

    @GetMapping(path = "/css", produces = "text/css")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<String> getCss() {
        String css = tokenService.toCss();
        String etag = "\"" + Integer.toHexString(css.hashCode()) + "\"";
        return ResponseEntity.ok()
            .cacheControl(CDN_CACHE)
            .eTag(etag)
            .body(css);
    }

    @GetMapping(path = "/mobile", produces = MediaType.APPLICATION_JSON_VALUE)
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Map<String, Object>> getMobileConfig() {
        Map<String, String> tokens = tokenService.compileTokens();
        Map<String, Object> config = new LinkedHashMap<>();

        // CamelCase keys optimized for React Native StyleSheet consumption
        Map<String, String> colors = new LinkedHashMap<>();
        pick(tokens, colors, "color.primary", "primaryColor");
        pick(tokens, colors, "color.primary-dark", "primaryDark");
        pick(tokens, colors, "color.primary-light", "primaryLight");
        pick(tokens, colors, "color.accent", "accentColor");
        pick(tokens, colors, "color.secondary", "secondaryColor");
        pick(tokens, colors, "color.success", "successColor");
        pick(tokens, colors, "color.warning", "warningColor");
        pick(tokens, colors, "color.error", "errorColor");
        pick(tokens, colors, "color.info", "infoColor");
        config.put("colors", colors);

        Map<String, String> fonts = new LinkedHashMap<>();
        pick(tokens, fonts, "font.body", "body");
        pick(tokens, fonts, "font.heading", "heading");
        pick(tokens, fonts, "font.mono", "mono");
        config.put("fonts", fonts);

        Map<String, String> radii = new LinkedHashMap<>();
        pick(tokens, radii, "radius.sm", "sm");
        pick(tokens, radii, "radius.md", "md");
        pick(tokens, radii, "radius.lg", "lg");
        config.put("radii", radii);

        Map<String, String> surfaces = new LinkedHashMap<>();
        pick(tokens, surfaces, "surface.page", "background");
        pick(tokens, surfaces, "surface.card", "card");
        pick(tokens, surfaces, "surface.header", "header");
        pick(tokens, surfaces, "surface.sidebar", "sidebar");
        config.put("surfaces", surfaces);

        config.put("version", 1);

        return ResponseEntity.ok()
            .cacheControl(CacheControl.maxAge(3600, TimeUnit.SECONDS).cachePublic())
            .body(config);
    }

    private static void pick(Map<String, String> src, Map<String, String> dst, String srcKey, String dstKey) {
        String v = src.get(srcKey);
        if (v != null) dst.put(dstKey, v);
    }
}