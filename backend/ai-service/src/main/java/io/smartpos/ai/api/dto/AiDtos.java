package io.smartpos.ai.api.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public final class AiDtos {

    private AiDtos() {}

    public record InsightResponse(String narrative, String provider, String model,
                                  Integer promptTokens, Integer completionTokens,
                                  Instant generatedAt) {}

    /** Ask the AI to narrate a date-range sales summary (top products, customers, deltas). */
    public record SalesTrendRequest(
            @NotNull LocalDate dateFrom,
            @NotNull LocalDate dateTo,
            UUID warehouseId,
            String tone               // "executive" | "casual" | "alert"
    ) {}

    /** Generic narrate-this-report — caller posts arbitrary JSON facts as a string. */
    public record NarrateRequest(
            @NotBlank @Size(max = 50) String reportKind,
            @NotBlank String factsJson,
            String question
    ) {}

    /** Free-form Q&A constrained by a system prompt. */
    public record ChatRequest(
            @NotBlank String prompt,
            String systemPrompt
    ) {}

    // ── Product AI: single-name suggest ────────────────────────────────────

    /** Lightweight option used when offering existing categories/brands/units to the model. */
    public record NamedRef(UUID id, String name) {}

    public record WorkspaceContext(
            List<NamedRef> categories,
            List<NamedRef> brands,
            List<NamedRef> units,
            String currency,
            BigDecimal defaultTaxRate
    ) {}

    public record ProductSuggestRequest(
            @NotBlank @Size(max = 200) String name,
            String hint,                   // optional extra context typed by user
            WorkspaceContext context
    ) {}

    public record ProductSuggestion(
            String name,
            String description,
            UUID categoryId,
            UUID brandId,
            UUID unitId,
            String barcodeSymbology,       // CODE128 | EAN13 | UPC | …
            String code,
            BigDecimal cost,
            BigDecimal price,
            BigDecimal wholesalePrice,
            BigDecimal minPrice,
            BigDecimal taxRate,
            Double confidence,             // 0.0 – 1.0
            String rationale,              // 1-2 sentence reason for transparency
            String provider,
            String model,
            Instant generatedAt
    ) {}

    // ── Product AI: free-text description → full product profile ──────────

    public record ProductDescribeRequest(
            @NotBlank @Size(max = 2000) String description,
            WorkspaceContext context
    ) {}

    public record ProductDescribeResponse(
            String name,
            String description,
            UUID categoryId,
            UUID subCategoryId,
            UUID brandId,
            UUID unitId,
            String barcodeSymbology,
            String code,
            BigDecimal cost,
            BigDecimal price,
            BigDecimal wholesalePrice,
            BigDecimal minPrice,
            BigDecimal taxRate,
            String taxMethod,
            Integer stockAlert,
            String type,
            Integer warrantyMonths,
            Integer guaranteeMonths,
            BigDecimal lengthCm,
            BigDecimal widthCm,
            BigDecimal heightCm,
            BigDecimal weightGrams,
            Boolean trackSerial,
            Boolean trackImei,
            Boolean featured,
            Boolean hideOnline,
            Integer points,
            Double confidence,
            java.util.Map<String, Double> fieldConfidence,
            String rationale,
            String provider,
            String model,
            Instant generatedAt
    ) {}

    // ── Product AI: import mapping (xlsx/csv rows → product objects) ──────

    public record ImportRow(int row, java.util.Map<String, String> values) {}

    public record ProductImportMapRequest(
            List<String> headers,
            @NotNull List<ImportRow> rows,
            WorkspaceContext context
    ) {}

    public record MappedRow(
            int row,
            String name,
            String description,
            UUID categoryId,
            UUID brandId,
            UUID unitId,
            String code,
            String barcodeSymbology,
            BigDecimal cost,
            BigDecimal price,
            BigDecimal wholesalePrice,
            BigDecimal minPrice,
            BigDecimal taxRate,
            BigDecimal quantity,
            Double confidence,
            List<String> warnings
    ) {}

    public record ProductImportMapResponse(
            List<MappedRow> rows,
            List<String> warnings,
            String provider,
            String model,
            Integer promptTokens,
            Integer completionTokens,
            Instant generatedAt
    ) {}

    // ── Product AI: image → full product profile (vision) ──────────────────
    //
    // {@code imageDataUrls} accepts either base64 data URIs
    // ({@code data:image/jpeg;base64,/9j/...}) or fetchable HTTPS URLs. The
    // service forwards them verbatim to the vision provider.

    public record ProductFromImageRequest(
            @NotNull @Size(min = 1, max = 3) List<@NotBlank @Size(max = 1_200_000) String> imageDataUrls,
            String hint,                    // optional user note like "this is a 25kg sack"
            WorkspaceContext context
    ) {}

    // Reuses ProductDescribeResponse — vision returns the same field set.

    // ── Product AI: batch image import (vision → product list) ──────────────
    //
    // Accepts one or more photos of a product list / catalogue page and returns
    // mapped product rows (same shape as /import-map) so the user can review and
    // bulk-create. The vision model is asked to OCR all items from the image(s)
    // and structure them as product rows.

    public record ProductImportFromImagesRequest(
            @NotNull @Size(min = 1, max = 5) List<@NotBlank @Size(max = 1_200_000) String> imageDataUrls,
            String hint,                    // e.g. "This is a supplier price list"
            WorkspaceContext context
    ) {}

    // Reuses ProductImportMapResponse — same shape as /import-map.

    // ── Product AI: disambiguation candidates ──────────────────────────────
    //
    // When the user types something vague ("Samsung phone"), suggest() may
    // return up to N candidate product profiles instead of forcing a guess.
    // Each candidate is a complete suggestion the UI can show as a quick-pick.

    public record ProductCandidatesResponse(
            ProductSuggestion top,                  // best single guess (back-compat)
            List<ProductSuggestion> candidates,     // ranked alternatives
            Boolean ambiguous,                      // true when multiple plausible matches
            String clarification,                   // suggested follow-up question for the user
            String provider,
            String model,
            Instant generatedAt
    ) {}
}
