package io.smartpos.product.domain.repository;

import io.smartpos.product.domain.model.PriceHistory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface PriceHistoryRepository extends JpaRepository<PriceHistory, UUID> {

    Page<PriceHistory> findByProductIdOrderByChangedAtDesc(UUID productId, Pageable pageable);
}
