package io.smartpos.product.domain.repository;

import io.smartpos.product.domain.model.PriceListLine;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

public interface PriceListLineRepository extends JpaRepository<PriceListLine, UUID> {
    List<PriceListLine> findByPriceListIdOrderByProductIdAscMinQtyAsc(UUID priceListId);

    @Transactional
    void deleteByPriceListId(UUID priceListId);
}
