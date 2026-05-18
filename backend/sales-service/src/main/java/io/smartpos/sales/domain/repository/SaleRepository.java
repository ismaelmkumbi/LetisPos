package io.smartpos.sales.domain.repository;

import io.smartpos.sales.api.SaleController;
import io.smartpos.sales.domain.model.Sale;
import io.smartpos.sales.domain.model.SaleStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface SaleRepository extends JpaRepository<Sale, UUID> {

    @EntityGraph(attributePaths = "lines")
    @Query("""
           SELECT s FROM Sale s
           WHERE (CAST(:dateFrom AS java.time.LocalDate) IS NULL OR s.date >= :dateFrom)
             AND (CAST(:dateTo AS java.time.LocalDate) IS NULL OR s.date <= :dateTo)
             AND (:customerId IS NULL OR s.customerId = :customerId)
             AND (:warehouseId IS NULL OR s.warehouseId = :warehouseId)
             AND (:status    IS NULL OR s.status = :status)
             AND s.tenantId = :tenantId
           """)
    Page<Sale> search(@Param("dateFrom") LocalDate dateFrom,
                      @Param("dateTo")   LocalDate dateTo,
                      @Param("customerId") UUID customerId,
                      @Param("warehouseId") UUID warehouseId,
                      @Param("status") SaleStatus status,
                      @Param("tenantId") UUID tenantId,
                      Pageable pageable);

    @EntityGraph(attributePaths = "lines")
    @Query("SELECT s FROM Sale s WHERE s.id = :id")
    Optional<Sale> findByIdWithLines(@Param("id") UUID id);

    @Query("SELECT COUNT(s) FROM Sale s WHERE s.ref LIKE CONCAT(:prefix, '%') AND s.tenantId = :tenantId")
    long countByRefStartingWith(@Param("prefix") String prefix, @Param("tenantId") UUID tenantId);

    @Query("""
        SELECT s FROM Sale s
        WHERE s.warehouseId = :warehouseId
          AND s.status = :status
          AND s.confirmedAt BETWEEN :from AND :to
          AND s.tenantId = :tenantId
        """)
    List<Sale> findByWarehouseIdAndStatusAndConfirmedAtBetween(
        @Param("warehouseId") UUID warehouseId,
        @Param("status") SaleStatus status,
        @Param("from") Instant from,
        @Param("to") Instant to,
        @Param("tenantId") UUID tenantId,
        Pageable pageable);

    @Query("""
        SELECT new io.smartpos.sales.api.dto.SalesByUserDto(
            s.userId, '', COUNT(s), SUM(s.grandTotal), SUM(s.subtotal), 0L)
        FROM Sale s
        WHERE s.tenantId = :tenantId
          AND s.status = 'CONFIRMED'
          AND (CAST(:dateFrom AS java.time.LocalDate) IS NULL OR s.date >= :dateFrom)
          AND (CAST(:dateTo AS java.time.LocalDate) IS NULL OR s.date <= :dateTo)
        GROUP BY s.userId
        ORDER BY SUM(s.grandTotal) DESC
        """)
    List<io.smartpos.sales.api.dto.SalesByUserDto> findSalesByUser(@Param("tenantId") UUID tenantId,
                                                      @Param("dateFrom") LocalDate dateFrom,
                                                      @Param("dateTo") LocalDate dateTo);

    @Query("""
           SELECT COALESCE(SUM(sl.unitCost * sl.qty), 0)
           FROM Sale s JOIN s.lines sl
           WHERE s.status = 'CONFIRMED'
             AND s.date BETWEEN :dateFrom AND :dateTo
             AND (:warehouseId IS NULL OR s.warehouseId = :warehouseId)
             AND s.tenantId = :tenantId
           """)
    BigDecimal costOfGoodsSold(@Param("tenantId") UUID tenantId,
                               @Param("dateFrom") LocalDate dateFrom,
                               @Param("dateTo") LocalDate dateTo,
                               @Param("warehouseId") UUID warehouseId);

    @Query("""
        SELECT s.id, sl.id, sl.productId, sl.variantId, s.warehouseId
        FROM Sale s JOIN s.lines sl
        WHERE s.status = 'CONFIRMED'
          AND sl.unitCost = 0
          AND s.tenantId = :tenantId
        ORDER BY s.date DESC
        """)
    List<Object[]> findLinesNeedingCostBackfill(@Param("tenantId") UUID tenantId);
}
