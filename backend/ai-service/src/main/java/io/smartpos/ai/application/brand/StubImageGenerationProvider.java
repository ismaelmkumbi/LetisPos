package io.smartpos.ai.application.brand;

import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;

/**
 * No-op fallback when no real image-gen provider is configured. Returns
 * placeholder URLs that include the prompt as a query parameter — useful
 * for local dev and for tenants on the free tier.
 *
 * The "letisbrand://" scheme tells the frontend to render a styled
 * placeholder card with the concept text instead of trying to fetch
 * a real image.
 */
@Component
public class StubImageGenerationProvider implements ImageGenerationProvider {

    @Override public String id() { return "stub"; }

    @Override public boolean isAvailable() { return true; }

    @Override
    public List<GeneratedImage> generate(GenerateRequest request) {
        int n = Math.max(1, request.count());
        String prompt = request.prompt() == null ? "logo" : request.prompt();
        String style = request.style() == null ? "default" : request.style();
        List<GeneratedImage> out = new ArrayList<>(n);
        for (int i = 1; i <= n; i++) {
            String url = "letisbrand://concept?style=" + urlEnc(style)
                + "&variant=" + i + "&prompt=" + urlEnc(prompt);
            out.add(new GeneratedImage(url, prompt, "stub", "concept-only", 0));
        }
        return out;
    }

    private static String urlEnc(String s) {
        return java.net.URLEncoder.encode(s == null ? "" : s,
            java.nio.charset.StandardCharsets.UTF_8);
    }
}
