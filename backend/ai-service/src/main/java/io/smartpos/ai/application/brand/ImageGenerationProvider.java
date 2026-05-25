package io.smartpos.ai.application.brand;

import java.util.List;

/**
 * Pluggable provider for AI image generation (logos, brand visuals).
 *
 * Implementations register themselves as Spring beans. The active one
 * is chosen by {@code smartpos.brand.image-gen.provider} (defaults to
 * "stub"). Switching providers is config-only.
 */
public interface ImageGenerationProvider {

    /** Provider id matched against the {@code smartpos.brand.image-gen.provider} property. */
    String id();

    /** True when this provider can actually generate images (has API key, etc.). */
    boolean isAvailable();

    /**
     * Synchronously generate {@code count} logo images for a prompt.
     * Returns hosted URLs (typically pre-signed). Throws on hard failure.
     */
    List<GeneratedImage> generate(GenerateRequest request);

    record GenerateRequest(
        String prompt,
        String style,            // minimalist / vintage / playful / corporate, optional
        int count,
        String size,             // "1024x1024" by default
        String tenantSlug         // used as object-prefix in storage
    ) {}

    record GeneratedImage(
        String url,
        String prompt,
        String provider,
        String model,
        long bytes
    ) {}
}
