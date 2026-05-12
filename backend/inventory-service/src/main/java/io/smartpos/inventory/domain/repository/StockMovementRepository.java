package io.smartpos.inventory.domain.repository;

import io.smartpos.inventory.domain.model.MovementType;
import io.smartpos.inventory.domain.model.StockMovement;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public interface StockMovementRepository extends JpaRepository<StockMovement, UUID> {
    Page<StockMovement> findByProductIdOrderByCreatedAtDesc(UUID productId, Pageable pageable);
    Page<StockMovement> findByWarehouseIdOrderByCreatedAtDesc(UUID warehouseId, Pageable pageable);

    /** Sales outflows for a product in the last N days — used for velocity. */
    @Query("""
           SELECT m FROM StockMovement m
           WHERE m.productId = :productId
             AND m.movementType = :movementType
             AND m.createdAt >= :since
             AND m.tenantId = :tenantId
           """)
    List<StockMovement> findByProductIdAndMovementTypeSince(
        @Param("productId") UUID productId,
        @Param("movementType") MovementType movementType,
        @Param("since") Instant since,
        @Param("tenantId") UUID tenantId);
}
