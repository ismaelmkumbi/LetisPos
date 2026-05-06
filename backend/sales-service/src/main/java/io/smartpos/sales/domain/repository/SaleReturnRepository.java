package io.smartpos.sales.domain.repository;

import io.smartpos.sales.domain.model.ReturnStatus;
import io.smartpos.sales.domain.model.SaleReturn;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.Optional;
import java.util.UUID;

public interface SaleReturnRepository extends JpaRepository<SaleReturn, UUID> {

    @Query("""
        SELECT r FROM SaleReturn r
        WHERE r.saleId = :saleId
          AND r.tenantId = :tenantId
        ORDER BY r.date DESC
        """)
    Page<SaleReturn> findBySaleIdOrderByDateDesc(
        @Param("saleId") UUID saleId,
        @Param("tenantId") UUID tenantId,
        Pageable pageable);

    @EntityGraph(attributePaths = "lines")
    @Query("SELECT r FROM SaleReturn r WHERE r.id = :id")
    Optional<SaleReturn> findByIdWithLines(@Param("id") UUID id);

    @Query("SELECT COUNT(r) FROM SaleReturn r WHERE r.ref LIKE CONCAT(:prefix, '%') AND r.tenantId = :tenantId")
    long countByRefStartingWith(@Param("prefix") String prefix, @Param("tenantId") UUID tenantId);

    /**
     * Top-level returns search — drives the frontend Returns index page.
     * All filters are optional.
     */
    @Query("""
           SELECT r FROM SaleReturn r
           WHERE (:from IS NULL OR r.date >= :from)
             AND (:to   IS NULL OR r.date <= :to)
             AND (:customerId  IS NULL OR r.customerId  = :customerId)
             AND (:warehouseId IS NULL OR r.warehouseId = :warehouseId)
             AND (:status      IS NULL OR r.status      = :status)
             AND r.tenantId = :tenantId
           ORDER BY r.date DESC, r.createdAt DESC
           """)
    Page<SaleReturn> search(@Param("from")        LocalDate from,
                            @Param("to")          LocalDate to,
                            @Param("customerId")  UUID customerId,
                            @Param("warehouseId") UUID warehouseId,
                            @Param("status")      ReturnStatus status,
                            @Param("tenantId")    UUID tenantId,
                            Pageable pageable);
}
