package io.smartpos.ai.api;

import io.smartpos.ai.api.dto.AiDtos;
import io.smartpos.ai.application.ProductAiService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

/**
 * AI-assisted product authoring.
 *
 *   POST /api/v1/ai/products/suggest      ← single name → suggested fields
 *   POST /api/v1/ai/products/import-map   ← rows + headers → mapped products
 *
 * Both endpoints require the {@code product.create} authority because their
 * output feeds directly into product creation flows.
 */
@RestController
@RequestMapping("/api/v1/ai/products")
@RequiredArgsConstructor
public class ProductAiController {

    private final ProductAiService service;

    @PostMapping("/suggest")
    @PreAuthorize("hasAuthority('product.create')")
    public AiDtos.ProductSuggestion suggest(@Valid @RequestBody AiDtos.ProductSuggestRequest req,
                                            @AuthenticationPrincipal Jwt jwt) {
        return service.suggest(req, principal(jwt));
    }

    @PostMapping("/describe")
    @PreAuthorize("hasAuthority('product.create')")
    public AiDtos.ProductDescribeResponse describe(@Valid @RequestBody AiDtos.ProductDescribeRequest req,
                                                    @AuthenticationPrincipal Jwt jwt) {
        return service.describe(req, principal(jwt));
    }

    @PostMapping("/import-map")
    @PreAuthorize("hasAuthority('product.create')")
    public AiDtos.ProductImportMapResponse importMap(@Valid @RequestBody AiDtos.ProductImportMapRequest req,
                                                     @AuthenticationPrincipal Jwt jwt) {
        return service.importMap(req, principal(jwt));
    }

    /**
     * Vision flow — POST one or more product photos (data: URLs or HTTPS) and
     * receive a full product profile, same shape as {@code /describe}. The
     * UI's camera/upload control sends base64 dataURLs; ~1 MB per image is
     * a reasonable client-side cap.
     */
    @PostMapping("/from-image")
    @PreAuthorize("hasAuthority('product.create')")
    public AiDtos.ProductDescribeResponse fromImage(@Valid @RequestBody AiDtos.ProductFromImageRequest req,
                                                    @AuthenticationPrincipal Jwt jwt) {
        return service.fromImage(req, principal(jwt));
    }

    /**
     * Disambiguation flow — same input shape as {@code /suggest} but returns
     * up to 4 ranked candidate variants the UI can render as quick-pick chips.
     */
    @PostMapping("/candidates")
    @PreAuthorize("hasAuthority('product.create')")
    public AiDtos.ProductCandidatesResponse candidates(@Valid @RequestBody AiDtos.ProductSuggestRequest req,
                                                       @AuthenticationPrincipal Jwt jwt) {
        return service.suggestCandidates(req, principal(jwt));
    }

    /**
     * Batch image import — takes one or more photos of a product list / catalogue
     * page and returns mapped product rows via the vision model, same shape as
     * {@code /import-map} so the UI can reuse the review → bulk-save pipeline.
     */
    @PostMapping("/import-from-images")
    @PreAuthorize("hasAuthority('product.create')")
    public AiDtos.ProductImportMapResponse importFromImages(@Valid @RequestBody AiDtos.ProductImportFromImagesRequest req,
                                                            @AuthenticationPrincipal Jwt jwt) {
        return service.importFromImages(req, principal(jwt));
    }

    private UUID principal(Jwt jwt) {
        if (jwt == null) return null;
        try { return UUID.fromString(jwt.getSubject()); } catch (Exception ignored) { return null; }
    }
}
