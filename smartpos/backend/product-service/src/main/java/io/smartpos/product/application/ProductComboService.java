package io.smartpos.product.application;

import io.smartpos.product.api.dto.ComboItemDto;
import io.smartpos.product.api.dto.CreateProductRequest.ComboItemInput;
import io.smartpos.product.domain.model.Product;
import io.smartpos.product.domain.model.ProductComboItem;
import io.smartpos.product.domain.model.ProductType;
import io.smartpos.product.domain.repository.ProductComboItemRepository;
import io.smartpos.product.domain.repository.ProductRepository;
import io.smartpos.product.infrastructure.config.RedisCacheConfig;
import lombok.RequiredArgsConstructor;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.UUID;

/**
 * Manages bundle composition for products of {@link ProductType#COMBO}.
 * Replacing the entire list (vs append-one-by-one) is the typical UX flow,
 * so we expose a single {@code replace} endpoint plus simple add/remove helpers.
 */
@Service
@RequiredArgsConstructor
public class ProductComboService {

    private final ProductRepository productRepo;
    private final ProductComboItemRepository comboRepo;

    @Transactional(readOnly = true)
    public List<ComboItemDto> list(UUID comboProductId) {
        return comboRepo.findByComboProductIdOrderByPositionAsc(comboProductId)
                .stream().map(ComboItemDto::from).toList();
    }

    @Transactional
    @CacheEvict(value = RedisCacheConfig.CACHE_PRODUCT, key = "#comboProductId")
    public List<ComboItemDto> replace(UUID comboProductId, List<ComboItemInput> items) {
        Product parent = productRepo.findById(comboProductId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Combo product not found"));

        // Guardrail: a combo cannot contain itself.
        if (items != null) {
            for (ComboItemInput it : items) {
                if (comboProductId.equals(it.componentProductId())) {
                    throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Combo cannot reference itself");
                }
                if (!productRepo.existsById(it.componentProductId())) {
                    throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                            "Component not found: " + it.componentProductId());
                }
            }
        }

        comboRepo.deleteByComboProductId(comboProductId);
        comboRepo.flush();

        if (items != null) {
            int idx = 0;
            for (ComboItemInput it : items) {
                comboRepo.save(ProductComboItem.builder()
                        .comboProductId(comboProductId)
                        .componentProductId(it.componentProductId())
                        .qty(it.qty())
                        .unitCost(it.unitCost())
                        .unitPrice(it.unitPrice())
                        .position(it.position() != null ? it.position() : idx)
                        .build());
                idx++;
            }
        }

        // Auto-flip type to COMBO when items are present (idempotent).
        if (items != null && !items.isEmpty() && parent.getType() != ProductType.COMBO) {
            parent.setType(ProductType.COMBO);
            productRepo.save(parent);
        }
        return list(comboProductId);
    }
}
