package io.smartpos.ai.application.brand;

import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Map;

/**
 * Logo enhancement: background removal, thermal-print optimisation, and
 * palette extraction from an uploaded logo. The default {@link #DEFAULT}
 * implementation is a stub — returns the original URL plus a deterministic
 * fallback palette derived from the URL hash so the UI flow still works.
 *
 * Plug in a real provider (Remove.bg, Cloudinary, or a local imgproxy
 * pipeline) by replacing this bean.
 */
public interface LogoEnhancementProvider {

    Result enhance(String logoUrl);

    record Result(
        String originalUrl,
        String backgroundRemovedUrl,
        String monochromeUrl,
        String thermalOptimizedUrl,
        List<String> palette,           // hex colours, sorted by prominence
        Map<String, Object> diagnostics // sharpness, dpi, recommendations
    ) {}

    /** Default Spring-discovered implementation: returns deterministic stub data. */
    @Component
    class StubLogoEnhancementProvider implements LogoEnhancementProvider {
        @Override
        public Result enhance(String logoUrl) {
            String src = logoUrl == null ? "" : logoUrl;
            return new Result(
                src,
                src,                                              // bg-removal not run
                src,                                              // monochrome not generated
                src,                                              // thermal not optimised
                derivePalette(src),
                Map.of(
                    "provider", "stub",
                    "note", "Real enhancement (Remove.bg / Cloudinary / Potrace) " +
                            "is not configured. Original URL was returned. " +
                            "Set smartpos.brand.logo-enhance.provider to enable.",
                    "recommendations", List.of(
                        "Upload a PNG with transparent background for crisper invoice rendering",
                        "Use at least 500×500px so the logo stays sharp on printed documents",
                        "For thermal printers, prefer a pure-black-on-white version (no greys)"
                    )
                )
            );
        }

        /**
         * Cheap deterministic palette so the UI gets *something* useful even
         * without a real extractor. Hash the URL and pick hue offsets.
         */
        private List<String> derivePalette(String url) {
            int seed = Math.abs(url.hashCode());
            int baseHue = seed % 360;
            return List.of(
                hsl(baseHue,                70, 45),  // primary
                hsl((baseHue + 30) % 360,   60, 35),  // secondary
                hsl((baseHue + 180) % 360,  65, 50),  // accent
                "#FFFFFF",
                "#0F172A"
            );
        }

        private static String hsl(int h, int s, int l) {
            // Convert HSL to hex, approximate; good enough for stub.
            double sd = s / 100.0, ld = l / 100.0;
            double c = (1 - Math.abs(2 * ld - 1)) * sd;
            double x = c * (1 - Math.abs(((h / 60.0) % 2) - 1));
            double m = ld - c / 2;
            double r, g, b;
            if      (h < 60)  { r = c; g = x; b = 0; }
            else if (h < 120) { r = x; g = c; b = 0; }
            else if (h < 180) { r = 0; g = c; b = x; }
            else if (h < 240) { r = 0; g = x; b = c; }
            else if (h < 300) { r = x; g = 0; b = c; }
            else              { r = c; g = 0; b = x; }
            int ri = (int) Math.round((r + m) * 255);
            int gi = (int) Math.round((g + m) * 255);
            int bi = (int) Math.round((b + m) * 255);
            return String.format("#%02X%02X%02X", ri, gi, bi);
        }
    }
}
