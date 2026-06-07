package io.smartpos.product.application;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.smartpos.product.domain.model.Product;
import io.smartpos.product.domain.model.ProductVerticalExtension;
import io.smartpos.product.domain.repository.ProductVerticalExtensionRepository;
import io.smartpos.product.domain.vertical.VerticalExtension;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;

@Slf4j
@Service
@RequiredArgsConstructor
public class VerticalExtensionService {

    private final ProductVerticalExtensionRepository repo;
    private final VerticalRegistry registry;
    private final TenantVerticalService tenantVerticalService;
    private final ObjectMapper objectMapper;

    /**
     * Load all vertical extensions for a product.
     */
    @Transactional(readOnly = true)
    public Map<String, JsonNode> loadForProduct(UUID productId) {
        Map<String, JsonNode> result = new HashMap<>();
        for (ProductVerticalExtension ext : repo.findByProductId(productId)) {
            try {
                result.put(ext.getVerticalKey(), objectMapper.readTree(ext.getData()));
            } catch (JsonProcessingException e) {
                log.warn("Failed to parse extension data for product {} vertical {}",
                        productId, ext.getVerticalKey());
            }
        }
        return result;
    }

    /**
     * Save (create or update) vertical extensions for a product.
     * Validates each extension against its vertical's rules and enforces
     * tenant vertical activation before saving.
     */
    @Transactional
    public void saveForProduct(UUID productId, UUID tenantId, Map<String, JsonNode> extensions) {
        if (extensions == null || extensions.isEmpty()) return;

        Set<String> activeVerticals = tenantVerticalService.getActiveVerticalKeys(tenantId);

        // Delete existing extensions not in the new map
        List<ProductVerticalExtension> existing = repo.findByProductId(productId);
        for (ProductVerticalExtension e : existing) {
            if (!extensions.containsKey(e.getVerticalKey())) {
                repo.delete(e);
            }
        }

        // Validate and upsert
        for (Map.Entry<String, JsonNode> entry : extensions.entrySet()) {
            String verticalKey = entry.getKey();
            JsonNode data = entry.getValue();

            // Skip null/empty — treated as "remove this extension"
            if (data == null || data.isNull() || data.isEmpty()) {
                repo.deleteByProductIdAndVerticalKey(productId, verticalKey);
                continue;
            }

            // Enforce tenant vertical activation
            if (!activeVerticals.contains(verticalKey)) {
                log.warn("Rejected extension save for inactive vertical '{}' on product {} (tenant {})",
                        verticalKey, productId, tenantId);
                throw new IllegalArgumentException(
                        "Vertical '" + verticalKey + "' is not active for this tenant");
            }

            // Validate via registered vertical
            VerticalExtension ext = registry.get(verticalKey)
                    .orElseThrow(() -> new IllegalArgumentException(
                            "Unknown vertical: " + verticalKey));
            ext.validate(null, data); // product reference optional for validation

            // Upsert
            Optional<ProductVerticalExtension> existingExt =
                    repo.findByProductIdAndVerticalKey(productId, verticalKey);
            try {
                String json = objectMapper.writeValueAsString(data);
                if (existingExt.isPresent()) {
                    existingExt.get().setData(json);
                    repo.save(existingExt.get());
                } else {
                    repo.save(ProductVerticalExtension.builder()
                            .productId(productId)
                            .verticalKey(verticalKey)
                            .data(json)
                            .tenantId(tenantId)
                            .build());
                }
            } catch (JsonProcessingException e) {
                log.error("Failed to serialize extension data for vertical '{}'", verticalKey, e);
                throw new IllegalArgumentException("Invalid extension data format", e);
            }
        }
    }

    /**
     * Delete all vertical extensions for a product.
     * Called on product delete (soft or hard). Triggers lifecycle hooks.
     */
    @Transactional
    public void deleteAll(UUID productId) {
        List<ProductVerticalExtension> exts = repo.findByProductId(productId);
        if (exts.isEmpty()) return;
        repo.deleteAll(exts);
        log.debug("Deleted {} vertical extensions for product {}", exts.size(), productId);
    }

    /**
     * Copy all vertical extensions from one product to another.
     * Only copies verticals that are active for the target tenant.
     */
    @Transactional
    public void copyFromProduct(UUID sourceProductId, UUID targetProductId, UUID targetTenantId) {
        List<ProductVerticalExtension> sourceExts = repo.findByProductId(sourceProductId);
        if (sourceExts.isEmpty()) return;

        Set<String> activeVerticals = tenantVerticalService.getActiveVerticalKeys(targetTenantId);

        for (ProductVerticalExtension src : sourceExts) {
            if (!activeVerticals.contains(src.getVerticalKey())) {
                log.debug("Skipping copy of inactive vertical '{}' for tenant {}",
                        src.getVerticalKey(), targetTenantId);
                continue;
            }
            repo.save(ProductVerticalExtension.builder()
                    .productId(targetProductId)
                    .verticalKey(src.getVerticalKey())
                    .data(src.getData())
                    .tenantId(targetTenantId)
                    .build());
        }
        log.debug("Copied {} vertical extensions from product {} to {}",
                Math.min(sourceExts.size(), activeVerticals.size()), sourceProductId, targetProductId);
    }
}
