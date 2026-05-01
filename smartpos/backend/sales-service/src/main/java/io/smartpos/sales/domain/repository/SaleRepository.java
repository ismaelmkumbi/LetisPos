package io.smartpos.sales.domain.repository;

import io.smartpos.sales.domain.model.Sale;
import io.smartpos.sales.domain.model.SaleStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.Optional;
import java.util.UUID;

public interface SaleRepository extends JpaRepository<Sale, UUID> {

    @EntityGraph(attributePaths = "lines")
    @Query("""
           SELECT s FROM Sale s
           WHERE (:dateFrom IS NULL OR s.date >= :dateFrom)
             AND (:dateTo   IS NULL OR s.date <= :dateTo)
             AND (:customerId IS NULL OR s.customerId = :customerId)
             AND (:warehouseId IS NULL OR s.warehouseId = :warehouseId)
             AND (:status    IS NULL OR s.status = :status)
           """)
    Page<Sale> search(@Param("dateFrom") LocalDate dateFrom,
                      @Param("dateTo")   LocalDate dateTo,
                      @Param("customerId") UUID customerId,
                      @Param("warehouseId") UUID warehouseId,
                      @Param("status") SaleStatus status,
                      Pageable pageable);

    @EntityGraph(attributePaths = "lines")
    @Query("SELECT s FROM Sale s WHERE s.id = :id")
    Optional<Sale> findByIdWithLines(@Param("id") UUID id);

    long countByRefStartingWith(String prefix);
}
