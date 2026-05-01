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
             AND (:dateFrom IS NULL OR a.date >= :dateFrom)
             AND (:dateTo   IS NULL OR a.date <= :dateTo)
           """)
    Page<Adjustment> search(@Param("warehouseId") UUID warehouseId,
                            @Param("dateFrom") LocalDate dateFrom,
                            @Param("dateTo")   LocalDate dateTo,
                            Pageable pageable);

    @EntityGraph(attributePaths = "lines")
    @Query("SELECT a FROM Adjustment a WHERE a.id = :id")
    Optional<Adjustment> findByIdWithLines(@Param("id") UUID id);

    long countByRefStartingWith(String prefix);
}
