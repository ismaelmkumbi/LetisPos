package io.smartpos.sales.domain.repository;

import io.smartpos.sales.domain.model.PosTerminal;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface PosTerminalRepository extends JpaRepository<PosTerminal, UUID> {

    Optional<PosTerminal> findByCodeIgnoreCase(String code);
    Optional<PosTerminal> findByPairingToken(String token);
    boolean existsByCodeIgnoreCase(String code);

    @Query("""
        SELECT t FROM PosTerminal t
        WHERE t.warehouseId = :warehouseId
          AND t.tenantId = :tenantId
        """)
    List<PosTerminal> findByWarehouseId(
        @Param("warehouseId") UUID warehouseId,
        @Param("tenantId") UUID tenantId);
}
