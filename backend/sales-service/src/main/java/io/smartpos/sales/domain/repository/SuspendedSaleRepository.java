package io.smartpos.sales.domain.repository;

import io.smartpos.sales.domain.model.SuspendedSale;
import io.smartpos.sales.domain.model.SuspendedSaleStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.UUID;

public interface SuspendedSaleRepository extends JpaRepository<SuspendedSale, UUID> {

    @Query("""
        SELECT s FROM SuspendedSale s
        WHERE s.tenantId = :tenantId
          AND (:status IS NULL OR s.status = :status)
          AND (:search IS NULL OR LOWER(s.ref) LIKE LOWER(CONCAT('%', :search, '%')))
        ORDER BY s.createdAt DESC
        """)
    Page<SuspendedSale> search(@Param("tenantId") UUID tenantId,
                               @Param("status") SuspendedSaleStatus status,
                               @Param("search") String search,
                               Pageable pageable);

    @Modifying
    @Query("UPDATE SuspendedSale s SET s.status = 'EXPIRED' WHERE s.status = 'OPEN' AND s.expiresAt < :now")
    int expireOldHolds(@Param("now") Instant now);
}
