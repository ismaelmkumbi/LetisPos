package io.smartpos.sales.domain.repository;

import io.smartpos.sales.domain.model.PurchaseReturn;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

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
}
