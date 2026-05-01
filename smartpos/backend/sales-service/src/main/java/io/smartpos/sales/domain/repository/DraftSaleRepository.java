package io.smartpos.sales.domain.repository;

import io.smartpos.sales.domain.model.DraftSale;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface DraftSaleRepository extends JpaRepository<DraftSale, UUID> {
    List<DraftSale> findByUserIdOrderByUpdatedAtDesc(UUID userId);
}
