package io.smartpos.ai.application.brand;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.client.WebClient;

import java.time.Duration;
import java.util.*;

/**
 * OpenAI DALL-E 3 image generation. Disabled when no API key is set
 * (then {@link StubImageGenerationProvider} wins by config). Costs
 * roughly $0.04 per 1024×1024 image as of 2026 pricing.
 *
 * The prompt is wrapped with a brand-friendly system instruction so
 * we get a vector-friendly mark, not a photographic illustration.
 */
@Component
public class DalleImageGenerationProvider implements ImageGenerationProvider {

    private static final Logger log = LoggerFactory.getLogger(DalleImageGenerationProvider.class);

    private final WebClient http = WebClient.builder()
        .codecs(c -> c.defaultCodecs().maxInMemorySize(4 * 1024 * 1024))
        .build();
    private final ObjectMapper om = new ObjectMapper();

    @Value("${smartpos.brand.image-gen.openai.api-key:${OPENAI_API_KEY:}}")
    private String apiKey;

    @Value("${smartpos.brand.image-gen.openai.base-url:https://api.openai.com/v1}")
    private String baseUrl;

    @Value("${smartpos.brand.image-gen.openai.model:dall-e-3}")
    private String model;

    @Override public String id() { return "openai-dalle"; }

    @Override public boolean isAvailable() {
        return apiKey != null && !apiKey.isBlank();
    }

    @Override
    public List<GeneratedImage> generate(GenerateRequest request) {
        if (!isAvailable()) {
            throw new IllegalStateException("OpenAI image-gen not configured");
        }
        // DALL-E 3 generates one image per call. Loop for `count`.
        int n = Math.max(1, Math.min(request.count(), 4));
        String size = request.size() != null ? request.size() : "1024x1024";
        String styledPrompt = wrapPrompt(request.prompt(), request.style());

        List<GeneratedImage> out = new ArrayList<>(n);
        for (int i = 0; i < n; i++) {
            try {
                Map<String, Object> body = Map.of(
                    "model", model,
                    "prompt", styledPrompt,
                    "n", 1,
                    "size", size,
                    "response_format", "url"
                );
                String resp = http.post()
                    .uri(baseUrl + "/images/generations")
                    .header("Authorization", "Bearer " + apiKey)
                    .header("Content-Type", "application/json")
                    .bodyValue(body)
                    .retrieve()
                    .bodyToMono(String.class)
                    .timeout(Duration.ofSeconds(60))
                    .block();
                JsonNode node = om.readTree(resp);
                String url = node.path("data").path(0).path("url").asText(null);
                if (url == null) throw new IllegalStateException("no url in DALL-E response");
                out.add(new GeneratedImage(url, request.prompt(), id(), model, 0));
            } catch (Exception e) {
                log.warn("DALL-E generation failed (variant {}/{}): {}", i + 1, n, e.getMessage());
            }
        }
        if (out.isEmpty()) {
            throw new IllegalStateException("DALL-E returned no images");
        }
        return out;
    }

    /** Add brand-friendly framing so DALL-E returns a clean mark, not a render. */
    private String wrapPrompt(String userPrompt, String style) {
        StringBuilder sb = new StringBuilder();
        sb.append("Flat vector-style brand logo on solid white background. ");
        sb.append("Clean lines, no text unless asked, centred composition, ");
        sb.append("suitable for embossing on invoices and receipts. ");
        if (style != null && !style.isBlank()) {
            sb.append("Style: ").append(style).append(". ");
        }
        sb.append("Logo concept: ").append(userPrompt);
        return sb.toString();
    }
}
