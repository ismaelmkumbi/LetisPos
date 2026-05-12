package io.smartpos.sales.domain.repository;

import io.smartpos.sales.domain.model.Promotion;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface PromotionRepository extends JpaRepository<Promotion, UUID> {

    Page<Promotion> findByTenantId(UUID tenantId, Pageable pageable);

    List<Promotion> findByActiveTrue();

    List<Promotion> findByTenantIdAndActiveTrue(UUID tenantId);
}
