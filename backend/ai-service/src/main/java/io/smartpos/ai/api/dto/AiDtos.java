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
}
