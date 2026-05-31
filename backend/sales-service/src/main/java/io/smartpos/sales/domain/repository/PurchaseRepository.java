package io.smartpos.sales.domain.repository;

import io.smartpos.sales.domain.model.Purchase;
import io.smartpos.sales.domain.model.PurchaseStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface PurchaseRepository extends JpaRepository<Purchase, UUID> {

    @EntityGraph(attributePaths = "lines")
    @Query("""
           SELECT p FROM Purchase p
           WHERE (CAST(:dateFrom AS java.time.LocalDate) IS NULL OR p.date >= :dateFrom)
             AND (CAST(:dateTo AS java.time.LocalDate) IS NULL OR p.date <= :dateTo)
             AND (:supplierId IS NULL OR p.supplierId = :supplierId)
             AND (:warehouseId IS NULL OR p.warehouseId = :warehouseId)
             AND (:status    IS NULL OR p.status = :status)
             AND p.tenantId = :tenantId
           """)
    Page<Purchase> search(@Param("dateFrom") LocalDate dateFrom,
                          @Param("dateTo")   LocalDate dateTo,
                          @Param("supplierId") UUID supplierId,
                          @Param("warehouseId") UUID warehouseId,
                          @Param("status") PurchaseStatus status,
                          @Param("tenantId") UUID tenantId,
                          Pageable pageable);

    @EntityGraph(attributePaths = "lines")
    @Query("""
           SELECT DISTINCT p FROM Purchase p JOIN FETCH p.lines
           WHERE p.tenantId = :tenantId
             AND p.status IN ('ORDERED', 'RECEIVED')
             AND (:supplierId IS NULL OR p.supplierId = :supplierId)
             AND (CAST(:dateFrom AS java.time.LocalDate) IS NULL OR p.date >= :dateFrom)
             AND (CAST(:dateTo AS java.time.LocalDate) IS NULL OR p.date <= :dateTo)
           ORDER BY p.date DESC
           """)
    Page<Purchase> findReceived(@Param("tenantId") UUID tenantId,
                                @Param("supplierId") UUID supplierId,
                                @Param("dateFrom") LocalDate dateFrom,
                                @Param("dateTo") LocalDate dateTo,
                                Pageable pageable);

    @EntityGraph(attributePaths = "lines")
    @Query("SELECT p FROM Purchase p WHERE p.id = :id")
    Optional<Purchase> findByIdWithLines(@Param("id") UUID id);

    @Query("SELECT COUNT(p) FROM Purchase p WHERE p.ref LIKE CONCAT(:prefix, '%') AND p.tenantId = :tenantId")
    long countByRefStartingWith(@Param("prefix") String prefix, @Param("tenantId") UUID tenantId);

    @Query("""
        SELECT pl.productId, pl.variantId, p.warehouseId, pl.unitCost, p.tenantId
        FROM Purchase p JOIN p.lines pl
        WHERE p.status = 'RECEIVED'
          AND p.tenantId = :tenantId
          AND pl.unitCost > 0
        ORDER BY p.receivedAt DESC
        """)
    List<Object[]> findLatestCostsByTenant(@Param("tenantId") UUID tenantId);

    /** Returns purchases with outstanding balance (UNPAID or PARTIAL), ordered by date. */
    @Query("""
        SELECT p FROM Purchase p
        WHERE p.tenantId = :tenantId
          AND p.paymentStatus IN ('UNPAID', 'PARTIAL')
        ORDER BY p.date DESC
        """)
    List<Purchase> findOutstandingByTenant(@Param("tenantId") UUID tenantId);

    /** Returns all outstanding purchases across all tenants (admin). */
    @Query("""
        SELECT p FROM Purchase p
        WHERE p.paymentStatus IN ('UNPAID', 'PARTIAL')
        ORDER BY p.date DESC
        """)
    List<Purchase> findAllOutstanding();
}
