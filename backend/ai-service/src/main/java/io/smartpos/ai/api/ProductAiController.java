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

    @PostMapping("/import-map")
    @PreAuthorize("hasAuthority('product.create')")
    public AiDtos.ProductImportMapResponse importMap(@Valid @RequestBody AiDtos.ProductImportMapRequest req,
                                                     @AuthenticationPrincipal Jwt jwt) {
        return service.importMap(req, principal(jwt));
    }

    private UUID principal(Jwt jwt) {
        if (jwt == null) return null;
        try { return UUID.fromString(jwt.getSubject()); } catch (Exception ignored) { return null; }
    }
}
