package io.smartpos.product.api.dto;

import com.fasterxml.jackson.databind.JsonNode;

import java.util.Map;

/**
 * Vertical extension data map for API requests/responses.
 * Key = vertical key (e.g., "pharmacy", "hardware")
 * Value = opaque JSON object validated per-vertical server-side
 */
public record VerticalExtensionDto(
        String verticalKey,
        JsonNode data
) {
    /**
     * Convert a Map<String, JsonNode> (from Jackson deserialization) to a typed map.
     */
    @SuppressWarnings("unchecked")
    public static Map<String, JsonNode> toMap(Object raw) {
        if (raw == null) return Map.of();
        if (raw instanceof Map) {
            try {
                return (Map<String, JsonNode>) raw;
            } catch (ClassCastException e) {
                return Map.of();
            }
        }
        return Map.of();
    }
}
