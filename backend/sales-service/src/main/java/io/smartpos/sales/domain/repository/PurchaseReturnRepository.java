package io.smartpos.sales.domain.repository;

import io.smartpos.sales.domain.model.PurchaseReturn;
import io.smartpos.sales.domain.model.ReturnStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.Optional;
import java.util.UUID;

public interface PurchaseReturnRepository extends JpaRepository<PurchaseReturn, UUID> {

    @Query("""
        SELECT r FROM PurchaseReturn r
        WHERE r.purchaseId = :purchaseId
          AND r.tenantId = :tenantId
        ORDER BY r.date DESC
        """)
    Page<PurchaseReturn> findByPurchaseIdOrderByDateDesc(
        @Param("purchaseId") UUID purchaseId,
        @Param("tenantId") UUID tenantId,
        Pageable pageable);

    @EntityGraph(attributePaths = "lines")
    @Query("SELECT r FROM PurchaseReturn r WHERE r.id = :id")
    Optional<PurchaseReturn> findByIdWithLines(@Param("id") UUID id);

    @Query("SELECT COUNT(r) FROM PurchaseReturn r WHERE r.ref LIKE CONCAT(:prefix, '%') AND r.tenantId = :tenantId")
    long countByRefStartingWith(@Param("prefix") String prefix, @Param("tenantId") UUID tenantId);

    @Query("""
        SELECT r FROM PurchaseReturn r
        WHERE r.tenantId = :tenantId
          AND (:search IS NULL OR LOWER(r.ref) LIKE LOWER(CONCAT('%', :search, '%')))
          AND (:status IS NULL OR r.status = :status)
          AND (:supplierId IS NULL OR r.supplierId = :supplierId)
          AND (CAST(:dateFrom AS java.time.LocalDate) IS NULL OR r.date >= :dateFrom)
          AND (CAST(:dateTo AS java.time.LocalDate) IS NULL OR r.date <= :dateTo)
        ORDER BY r.date DESC
        """)
    Page<PurchaseReturn> search(@Param("tenantId") UUID tenantId,
                                @Param("search") String search,
                                @Param("status") ReturnStatus status,
                                @Param("supplierId") UUID supplierId,
                                @Param("dateFrom") LocalDate dateFrom,
                                @Param("dateTo") LocalDate dateTo,
                                Pageable pageable);
}
