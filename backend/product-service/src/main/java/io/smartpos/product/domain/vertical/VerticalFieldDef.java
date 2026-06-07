package io.smartpos.product.domain.vertical;

/**
 * Metadata describing one field in a vertical extension form, enabling
 * the frontend to render dynamic product forms without hardcoding verticals.
 */
public record VerticalFieldDef(
    String fieldKey,
    String fieldType,   // 'text' | 'number' | 'select' | 'toggle' | 'date' | 'json'
    String label,
    boolean required,
    String validationPattern,
    int sortOrder
) {
    // compact canonical constructor with defaults
    public VerticalFieldDef {
        if (fieldType == null) fieldType = "text";
        if (label == null) label = fieldKey;
    }

    /** Convenience constructor without validationPattern. */
    public VerticalFieldDef(String fieldKey, String fieldType, String label,
                            boolean required, int sortOrder) {
        this(fieldKey, fieldType, label, required, null, sortOrder);
    }
}
