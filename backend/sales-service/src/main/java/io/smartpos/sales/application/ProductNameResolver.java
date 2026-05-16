package io.smartpos.sales.application;

import io.smartpos.sales.infrastructure.feign.ProductClient;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.UUID;
import java.util.regex.Pattern;

/**
 * Resolves product names for snapshot storage.
 *
 * Fast path: if the client already sent a human-readable name, use it directly
 * (no remote call). Only calls product-service when the name is missing or
 * looks like a raw UUID.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class ProductNameResolver {

    private static final Pattern UUID_PATTERN =
        Pattern.compile("^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$",
                        Pattern.CASE_INSENSITIVE);

    private final ProductClient productClient;

    /**
     * Resolve a display-worthy product name.
     *
     * @param productId          the product to resolve
     * @param clientProvidedName what the client sent (may be null, blank, or a UUID)
     * @return a human-readable name, never null
     */
    public String resolve(UUID productId, String clientProvidedName) {
        if (clientProvidedName != null && !clientProvidedName.isBlank()
            && !UUID_PATTERN.matcher(clientProvidedName).matches()) {
            return clientProvidedName;
        }
        try {
            return productClient.getProduct(productId).name();
        } catch (Exception e) {
            log.warn("Failed to resolve product name for {}: {}", productId, e.getMessage());
            if (clientProvidedName != null && !clientProvidedName.isBlank()) {
                return clientProvidedName;
            }
            return "Product " + productId.toString().substring(0, 8);
        }
    }
}
