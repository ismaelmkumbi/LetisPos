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

    Optional<CashRegisterSession> findTopByWarehouseIdAndStatusOrderByOpenedAtDesc(
        UUID warehouseId, CashRegisterStatus status);

    @Query("""
        SELECT s FROM CashRegisterSession s
        WHERE s.warehouseId = :warehouseId
        ORDER BY s.openedAt DESC
        """)
    List<CashRegisterSession> findByWarehouseId(
        @Param("warehouseId") UUID warehouseId);
}
