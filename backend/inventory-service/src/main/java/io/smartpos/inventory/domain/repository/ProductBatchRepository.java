package io.smartpos.inventory.domain.repository;

import io.smartpos.inventory.domain.model.ProductBatch;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public interface ProductBatchRepository extends JpaRepository<ProductBatch, UUID>, JpaSpecificationExecutor<ProductBatch> {

    List<ProductBatch> findByProductIdAndWarehouseIdAndStatusOrderByExpiryDateAsc(
            UUID productId, UUID warehouseId, String status);

    List<ProductBatch> findByWarehouseIdAndExpiryDateBeforeAndStatusAndOnHandGreaterThan(
            UUID warehouseId, LocalDate expiryBefore, String status, BigDecimal minOnHand);

    Page<ProductBatch> findByWarehouseIdAndExpiryDateBeforeAndStatusAndOnHandGreaterThan(
            UUID warehouseId, LocalDate expiryBefore, String status, BigDecimal minOnHand, Pageable pageable);

    List<ProductBatch> findByExpiryDateBeforeAndStatusAndOnHandGreaterThan(
            LocalDate expiryBefore, String status, BigDecimal minOnHand);

    Page<ProductBatch> findByExpiryDateBeforeAndStatusAndOnHandGreaterThan(
            LocalDate expiryBefore, String status, BigDecimal minOnHand, Pageable pageable);
}
