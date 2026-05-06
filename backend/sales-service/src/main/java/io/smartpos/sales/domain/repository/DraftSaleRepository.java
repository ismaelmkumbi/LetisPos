package io.smartpos.sales.domain.repository;

import io.smartpos.sales.domain.model.DraftSale;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.UUID;

public interface DraftSaleRepository extends JpaRepository<DraftSale, UUID> {

    @Query("""
        SELECT d FROM DraftSale d
        WHERE d.userId = :userId
          AND d.tenantId = :tenantId
        ORDER BY d.updatedAt DESC
        """)
    List<DraftSale> findByUserIdOrderByUpdatedAtDesc(
        @Param("userId") UUID userId,
        @Param("tenantId") UUID tenantId);
}
