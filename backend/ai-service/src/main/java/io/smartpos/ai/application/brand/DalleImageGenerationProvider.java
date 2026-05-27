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
 * OpenAI image generation. Disabled when no API key is set, then
 * {@link StubImageGenerationProvider} wins by config.
 *
 * Supports GPT Image models, which return base64 image data, and DALL-E
 * models, which can return hosted URLs.
 */
@Component
public class DalleImageGenerationProvider implements ImageGenerationProvider {

    private static final Logger log = LoggerFactory.getLogger(DalleImageGenerationProvider.class);

    private final WebClient http = WebClient.builder()
        .codecs(c -> c.defaultCodecs().maxInMemorySize(20 * 1024 * 1024))
        .build();
    private final ObjectMapper om = new ObjectMapper();

    @Value("${smartpos.brand.image-gen.openai.api-key:${OPENAI_API_KEY:}}")
    private String apiKey;

    @Value("${smartpos.brand.image-gen.openai.base-url:https://api.openai.com/v1}")
    private String baseUrl;

    @Value("${smartpos.brand.image-gen.openai.model:${OPENAI_IMAGE_MODEL:gpt-image-1}}")
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
        int n = Math.max(1, Math.min(request.count(), 4));
        String size = request.size() != null ? request.size() : "1024x1024";
        String styledPrompt = wrapPrompt(request.prompt(), request.style());

        List<GeneratedImage> out = new ArrayList<>(n);
        for (int i = 0; i < n; i++) {
            try {
                Map<String, Object> body = imageRequestBody(styledPrompt, size);
                String resp = http.post()
                    .uri(baseUrl + "/images/generations")
                    .header("Authorization", "Bearer " + apiKey)
                    .header("Content-Type", "application/json")
                    .bodyValue(body)
                    .retrieve()
                    .bodyToMono(String.class)
                    .timeout(Duration.ofSeconds(120))
                    .block();
                JsonNode node = om.readTree(resp);
                String url = imageUrl(node);
                if (url == null) throw new IllegalStateException("no image data in OpenAI response");
                out.add(new GeneratedImage(url, request.prompt(), id(), model, 0));
            } catch (Exception e) {
                log.warn("OpenAI image generation failed (variant {}/{}): {}", i + 1, n, e.getMessage());
            }
        }
        if (out.isEmpty()) {
            throw new IllegalStateException("OpenAI image generation returned no images");
        }
        return out;
    }

    private Map<String, Object> imageRequestBody(String styledPrompt, String size) {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("model", model);
        body.put("prompt", styledPrompt);
        body.put("n", 1);
        body.put("size", size);
        if (model != null && model.startsWith("gpt-image")) {
            body.put("quality", "medium");
            body.put("output_format", "png");
        } else {
            body.put("response_format", "url");
        }
        return body;
    }

    private String imageUrl(JsonNode node) {
        JsonNode first = node.path("data").path(0);
        String url = first.path("url").asText(null);
        if (url != null && !url.isBlank()) return url;
        String b64 = first.path("b64_json").asText(null);
        if (b64 != null && !b64.isBlank()) return "data:image/png;base64," + b64;
        return null;
    }

    /** Add brand-friendly framing so OpenAI returns a clean mark, not a render. */
    private String wrapPrompt(String userPrompt, String style) {
        StringBuilder sb = new StringBuilder();
        sb.append("Flat vector-style brand logo on solid white background. ");
        sb.append("Clean lines, centred composition, premium retail brand identity, ");
        sb.append("suitable for invoices, receipts, quotations, stamps, and document headers. ");
        sb.append("Do not imitate the Letis POS logo or use a large letter L. ");
        sb.append("Avoid mockups, shadows, tiny details, and decorative backgrounds. ");
        if (style != null && !style.isBlank()) {
            sb.append("Style: ").append(style).append(". ");
        }
        sb.append("Logo concept: ").append(userPrompt);
        return sb.toString();
    }
}
