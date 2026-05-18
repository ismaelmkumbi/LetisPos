package io.smartpos.product.domain.repository;

import io.smartpos.product.domain.model.ProductBatch;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ProductBatchRepository extends JpaRepository<ProductBatch, UUID> {

    Optional<ProductBatch> findByBatchNumberIgnoreCaseAndTenantId(String batchNumber, UUID tenantId);

    boolean existsByBatchNumberIgnoreCaseAndTenantId(String batchNumber, UUID tenantId);

    List<ProductBatch> findByProductIdOrderByExpiryDateAsc(UUID productId);

    List<ProductBatch> findByExpiryDateBeforeAndQtyGreaterThan(LocalDate date, int qty);

    List<ProductBatch> findByTenantIdOrderByBatchNumberAsc(UUID tenantId);
}
