package io.smartpos.sales.domain.repository;

import io.smartpos.sales.domain.model.Quotation;
import io.smartpos.sales.domain.model.QuotationStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.Optional;
import java.util.UUID;

public interface QuotationRepository extends JpaRepository<Quotation, UUID> {

    @EntityGraph(attributePaths = "lines")
    @Query("""
           SELECT q FROM Quotation q
           WHERE (:dateFrom IS NULL OR q.date >= :dateFrom)
             AND (:dateTo   IS NULL OR q.date <= :dateTo)
             AND (:customerId IS NULL OR q.customerId = :customerId)
             AND (:status    IS NULL OR q.status = :status)
             AND q.tenantId = :tenantId
           """)
    Page<Quotation> search(@Param("dateFrom") LocalDate dateFrom,
                           @Param("dateTo")   LocalDate dateTo,
                           @Param("customerId") UUID customerId,
                           @Param("status") QuotationStatus status,
                           @Param("tenantId") UUID tenantId,
                           Pageable pageable);

    @EntityGraph(attributePaths = "lines")
    @Query("SELECT q FROM Quotation q WHERE q.id = :id")
    Optional<Quotation> findByIdWithLines(@Param("id") UUID id);

    @Query("SELECT COUNT(q) FROM Quotation q WHERE q.ref LIKE CONCAT(:prefix, '%') AND q.tenantId = :tenantId")
    long countByRefStartingWith(@Param("prefix") String prefix, @Param("tenantId") UUID tenantId);
}
