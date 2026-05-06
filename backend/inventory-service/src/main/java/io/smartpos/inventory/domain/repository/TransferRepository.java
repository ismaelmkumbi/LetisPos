package io.smartpos.inventory.domain.repository;

import io.smartpos.inventory.domain.model.Transfer;
import io.smartpos.inventory.domain.model.TransferStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.UUID;

public interface TransferRepository extends JpaRepository<Transfer, UUID> {
    @EntityGraph(attributePaths = "lines")
    @Query("""
           SELECT t FROM Transfer t
           WHERE (:status IS NULL OR t.status = :status)
             AND (:dateFrom IS NULL OR t.date >= :dateFrom)
             AND (:dateTo   IS NULL OR t.date <= :dateTo)
             AND t.tenantId = :tenantId
           """)
    Page<Transfer> search(@Param("status") TransferStatus status,
                          @Param("dateFrom") LocalDate dateFrom,
                          @Param("dateTo")   LocalDate dateTo,
                          @Param("tenantId") UUID tenantId,
                          Pageable pageable);

    @EntityGraph(attributePaths = "lines")
    @Query("SELECT t FROM Transfer t WHERE t.id = :id")
    java.util.Optional<Transfer> findByIdWithLines(@Param("id") UUID id);

    long countByRefStartingWith(String prefix);
}
