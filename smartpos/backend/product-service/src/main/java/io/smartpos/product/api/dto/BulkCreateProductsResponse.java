package io.smartpos.product.api.dto;

import java.util.List;
import java.util.UUID;

/**
 * Response for {@link BulkCreateProductsRequest}.
 *
 *   created — items that were successfully persisted (with their new id + code)
 *   failed  — items that hit a validation/conflict error (e.g. duplicate SKU)
 *
 * Each row carries its original 0-based input index so the UI can highlight
 * the offending row in the import preview.
 */
public record BulkCreateProductsResponse(
        int total,
        int createdCount,
        int failedCount,
        List<Created> created,
        List<Failed>  failed
) {
    public record Created(int index, UUID id, String code, String name) {}
    public record Failed (int index, String code, String name, String error) {}
}
