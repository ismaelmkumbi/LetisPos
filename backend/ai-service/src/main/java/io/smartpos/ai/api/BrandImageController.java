package io.smartpos.ai.api;

import io.smartpos.ai.application.brand.ImageGenerationProvider;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/ai/brand")
@RequiredArgsConstructor
public class BrandImageController {

    private final ImageGenerationProvider imageGenerationProvider;

    @PostMapping("/logo-image")
    @PreAuthorize("isAuthenticated()")
    public Map<String, Object> generateLogoImage(@RequestBody LogoImageRequest request) {
        String prompt = promptFor(request);
        List<ImageGenerationProvider.GeneratedImage> images = imageGenerationProvider.generate(
            new ImageGenerationProvider.GenerateRequest(
                prompt,
                request.style(),
                request.count() != null ? request.count() : 3,
                request.size() != null && !request.size().isBlank() ? request.size() : "1024x1024",
                request.tenantSlug()
            )
        );

        Map<String, Object> response = new LinkedHashMap<>();
        response.put("provider", imageGenerationProvider.id());
        response.put("model", images.isEmpty() ? null : images.get(0).model());
        response.put("images", images);
        response.put("message", imageGenerationProvider.id().equals("stub")
            ? "AI image generation is not configured; returned concept placeholders."
            : "Generated logo images with the configured AI image provider.");
        return response;
    }

    private static String promptFor(LogoImageRequest r) {
        StringBuilder prompt = new StringBuilder();
        prompt.append("Professional logo for ");
        prompt.append(nonBlank(r.businessName(), "a retail business"));
        prompt.append(". Industry: ").append(nonBlank(r.industry(), "general retail")).append(". ");
        if (r.description() != null && !r.description().isBlank()) {
            prompt.append("Business description: ").append(r.description()).append(". ");
        }
        if (r.userPrompt() != null && !r.userPrompt().isBlank()) {
            prompt.append("Merchant request: ").append(r.userPrompt()).append(". ");
        }
        prompt.append("Use brand colors primary ").append(nonBlank(r.primaryColor(), "#16A34A"));
        prompt.append(", secondary ").append(nonBlank(r.secondaryColor(), "#1E293B"));
        prompt.append(", accent ").append(nonBlank(r.accentColor(), "#F59E0B")).append(". ");
        prompt.append("Create a premium, simple, memorable mark that prints well on invoices, receipts, quotations, and stamps. ");
        prompt.append("Avoid tiny details, mockups, shadows, photo realism, and decorative backgrounds.");
        return prompt.toString();
    }

    private static String nonBlank(String value, String fallback) {
        return value == null || value.isBlank() ? fallback : value;
    }

    public record LogoImageRequest(
        String businessName,
        String industry,
        String description,
        String userPrompt,
        String style,
        String primaryColor,
        String secondaryColor,
        String accentColor,
        Integer count,
        String size,
        String tenantSlug
    ) {}
}
