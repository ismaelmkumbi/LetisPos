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
import java.util.Optional;
import java.util.UUID;

public interface PurchaseRepository extends JpaRepository<Purchase, UUID> {

    @EntityGraph(attributePaths = "lines")
    @Query("""
           SELECT p FROM Purchase p
           WHERE (:dateFrom IS NULL OR p.date >= :dateFrom)
             AND (:dateTo   IS NULL OR p.date <= :dateTo)
             AND (:supplierId IS NULL OR p.supplierId = :supplierId)
             AND (:warehouseId IS NULL OR p.warehouseId = :warehouseId)
             AND (:status    IS NULL OR p.status = :status)
           """)
    Page<Purchase> search(@Param("dateFrom") LocalDate dateFrom,
                          @Param("dateTo")   LocalDate dateTo,
                          @Param("supplierId") UUID supplierId,
                          @Param("warehouseId") UUID warehouseId,
                          @Param("status") PurchaseStatus status,
                          Pageable pageable);

    @EntityGraph(attributePaths = "lines")
    @Query("SELECT p FROM Purchase p WHERE p.id = :id")
    Optional<Purchase> findByIdWithLines(@Param("id") UUID id);

    long countByRefStartingWith(String prefix);
}
