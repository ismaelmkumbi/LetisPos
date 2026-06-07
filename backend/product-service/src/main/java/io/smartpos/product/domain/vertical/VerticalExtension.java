package io.smartpos.product.domain.vertical;

import com.fasterxml.jackson.databind.JsonNode;
import io.smartpos.product.domain.model.Product;

import java.util.Set;

/**
 * Contract for a vertical extension module.
 *
 * Each vertical (pharmacy, hardware, restaurant, supermarket, etc.) implements
 * this interface and registers itself as a Spring bean. The core product service
 * discovers verticals at runtime via {@link io.smartpos.product.application.VerticalRegistry}
 * — no compile-time dependency on vertical-specific code.
 */
public interface VerticalExtension {

    /** Unique key, matching {@code vertical_definitions.key} */
    String getKey();

    /** Human-readable display label */
    String getLabel();

    /** Feature key required for this vertical to be active (null = always available) */
    default String getRequiredFeatureKey() { return null; }

    /**
     * Validate extension data before persisting.
     * Throw {@link org.springframework.web.server.ResponseStatusException} or
     * {@link jakarta.validation.ConstraintViolationException} on failure.
     */
    void validate(Product product, JsonNode extensionData);

    /** Called after a product is created. Use for side effects (e.g., pharmacy batch registration). */
    default void onProductCreated(Product product, JsonNode extensionData) {}

    /** Called after a product is updated. */
    default void onProductUpdated(Product product, JsonNode extensionData) {}

    /** Called after a product is deleted (soft or hard). */
    default void onProductDeleted(Product product) {}

    /** Return the DTO class used to deserialize extension data for this vertical. */
    Class<?> getExtensionDtoClass();

    /** Return field definitions for dynamic UI generation. */
    default Set<VerticalFieldDef> getFieldDefinitions() { return Set.of(); }

    /** Whether this product should show this vertical's fields by default. */
    default boolean isApplicable(Product product) { return true; }
}
