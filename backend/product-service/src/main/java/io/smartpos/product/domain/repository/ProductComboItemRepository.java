package io.smartpos.product.domain.repository;

import io.smartpos.product.domain.model.ProductComboItem;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface ProductComboItemRepository extends JpaRepository<ProductComboItem, UUID> {

    List<ProductComboItem> findByComboProductIdOrderByPositionAsc(UUID comboProductId);

    void deleteByComboProductId(UUID comboProductId);
}
