package io.smartpos.inventory.domain.repository;

import io.smartpos.inventory.domain.model.Adjustment;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.Optional;
import java.util.UUID;

public interface AdjustmentRepository extends JpaRepository<Adjustment, UUID> {

    @EntityGraph(attributePaths = "lines")
    @Query("""
           SELECT a FROM Adjustment a
           WHERE (:warehouseId IS NULL OR a.warehouseId = :warehouseId)
             AND (CAST(:dateFrom AS java.time.LocalDate) IS NULL OR a.date >= :dateFrom)
             AND (CAST(:dateTo AS java.time.LocalDate) IS NULL OR a.date <= :dateTo)
             AND a.tenantId = :tenantId
           """)
    Page<Adjustment> search(@Param("warehouseId") UUID warehouseId,
                            @Param("dateFrom") LocalDate dateFrom,
                            @Param("dateTo")   LocalDate dateTo,
                            @Param("tenantId") UUID tenantId,
                            Pageable pageable);

    @EntityGraph(attributePaths = "lines")
    @Query("SELECT a FROM Adjustment a WHERE a.id = :id")
    Optional<Adjustment> findByIdWithLines(@Param("id") UUID id);

    long countByRefStartingWith(String prefix);
}
