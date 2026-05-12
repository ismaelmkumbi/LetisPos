package io.smartpos.inventory.domain.repository;

import io.smartpos.inventory.domain.model.StockLevel;
import jakarta.persistence.LockModeType;
import jakarta.persistence.QueryHint;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.jpa.repository.QueryHints;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface StockLevelRepository extends JpaRepository<StockLevel, UUID> {

    /** Read-only lookup (no lock) — for listing. */
    @Query("""
           SELECT s FROM StockLevel s
           WHERE s.productId = :productId
             AND (:variantId IS NULL AND s.variantId IS NULL OR s.variantId = :variantId)
             AND s.warehouseId = :warehouseId
             AND s.tenantId = :tenantId
           """)
    Optional<StockLevel> find(@Param("productId") UUID productId,
                              @Param("variantId") UUID variantId,
                              @Param("warehouseId") UUID warehouseId,
                              @Param("tenantId") UUID tenantId);

    /**
     * Pessimistic-write lock with {@code SKIP LOCKED} semantics — used on the
     * POS hot path. Postgres serialises concurrent writers on the same row
     * without blocking reads. The @QueryHint below makes Hibernate fail fast
     * if someone else holds the lock, rather than waiting indefinitely.
     *
     * NOTE: SKIP LOCKED isn't right for reservations (we can't silently skip
     * the row — we have to fail the sale), so we use standard PESSIMISTIC_WRITE
     * with a short timeout instead.
     */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @QueryHints({ @QueryHint(name = "jakarta.persistence.lock.timeout", value = "3000") })
    @Query("""
           SELECT s FROM StockLevel s
           WHERE s.productId = :productId
             AND (:variantId IS NULL AND s.variantId IS NULL OR s.variantId = :variantId)
             AND s.warehouseId = :warehouseId
             AND s.tenantId = :tenantId
           """)
    Optional<StockLevel> findForUpdate(@Param("productId") UUID productId,
                                       @Param("variantId") UUID variantId,
                                       @Param("warehouseId") UUID warehouseId,
                                       @Param("tenantId") UUID tenantId);

    Page<StockLevel> findByWarehouseId(UUID warehouseId, Pageable pageable);

    List<StockLevel> findByProductId(UUID productId);

    /** Low-stock query — uses the partial index. */
    @Query("""
           SELECT s FROM StockLevel s
           WHERE (:warehouseId IS NULL OR s.warehouseId = :warehouseId)
             AND (s.onHand - s.reserved) <= s.stockAlertThreshold
             AND s.stockAlertThreshold > 0
             AND s.tenantId = :tenantId
           """)
    Page<StockLevel> findLowStock(@Param("warehouseId") UUID warehouseId,
                                  @Param("tenantId") UUID tenantId,
                                  Pageable pageable);

    /** Batch lookup — stock levels for many products in one warehouse. */
    @Query("""
           SELECT s FROM StockLevel s
           WHERE s.warehouseId = :warehouseId
             AND s.productId IN (:productIds)
             AND s.variantId IS NULL
             AND s.tenantId = :tenantId
           """)
    List<StockLevel> findByWarehouseAndProducts(@Param("warehouseId") UUID warehouseId,
                                                @Param("productIds") List<UUID> productIds,
                                                @Param("tenantId") UUID tenantId);

    /** All stock levels for a given tenant. */
    List<StockLevel> findByTenantId(UUID tenantId);
}
