package io.smartpos.ai.application.brand;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Primary;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Map;

/**
 * Routes brand-image-generation calls to the configured provider
 * (default: stub). Switching between stub and DALL-E is one config line:
 *   smartpos.brand.image-gen.provider=openai-dalle
 */
@Primary
@Component
public class ImageGenerationRouter implements ImageGenerationProvider {

    private final Map<String, ImageGenerationProvider> byId;

    @Value("${smartpos.brand.image-gen.provider:stub}")
    private String configured;

    public ImageGenerationRouter(List<ImageGenerationProvider> all) {
        this.byId = new java.util.HashMap<>();
        for (ImageGenerationProvider p : all) {
            if (p instanceof ImageGenerationRouter) continue;
            byId.put(p.id(), p);
        }
    }

    private ImageGenerationProvider active() {
        ImageGenerationProvider p = byId.get(configured);
        if (p != null && p.isAvailable()) return p;
        return byId.get("stub");
    }

    @Override public String id() { return active().id(); }

    @Override public boolean isAvailable() { return active().isAvailable(); }

    @Override
    public List<GeneratedImage> generate(GenerateRequest request) {
        return active().generate(request);
    }
}
