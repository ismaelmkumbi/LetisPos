package io.smartpos.sales.domain.repository;

import io.smartpos.sales.domain.model.CashRegisterSession;
import io.smartpos.sales.domain.model.CashRegisterStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface CashRegisterSessionRepository extends JpaRepository<CashRegisterSession, UUID> {

    @Query("""
        SELECT s FROM CashRegisterSession s
        WHERE s.warehouseId = :warehouseId
          AND s.status = :status
          AND s.tenantId = :tenantId
        ORDER BY s.openedAt DESC
        """)
    Optional<CashRegisterSession> findTopByWarehouseIdAndStatus(
        @Param("warehouseId") UUID warehouseId,
        @Param("status") CashRegisterStatus status,
        @Param("tenantId") UUID tenantId);

    @Query("""
        SELECT s FROM CashRegisterSession s
        WHERE s.warehouseId = :warehouseId
          AND s.tenantId = :tenantId
        ORDER BY s.openedAt DESC
        """)
    List<CashRegisterSession> findByWarehouseId(
        @Param("warehouseId") UUID warehouseId,
        @Param("tenantId") UUID tenantId);
}
