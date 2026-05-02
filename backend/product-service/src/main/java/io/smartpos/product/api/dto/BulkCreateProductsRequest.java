package io.smartpos.product.api.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Size;

import java.util.List;

/**
 * Bulk create payload — typically produced by the AI import wizard.
 * Each item is a {@link CreateProductRequest}; the service tries to insert
 * them all and returns a {@link BulkCreateProductsResponse} with per-row
 * results so the UI can show created / skipped / failed counts.
 *
 * Capped at 500 items per call to keep transaction time bounded.
 */
public record BulkCreateProductsRequest(
        @NotEmpty @Size(max = 500) @Valid List<CreateProductRequest> items
) {}
