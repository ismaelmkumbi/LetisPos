package io.smartpos.sales.domain.repository;

import io.smartpos.sales.domain.model.PosTerminal;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface PosTerminalRepository extends JpaRepository<PosTerminal, UUID> {

    Optional<PosTerminal> findByCodeIgnoreCase(String code);
    Optional<PosTerminal> findByPairingToken(String token);
    boolean existsByCodeIgnoreCase(String code);
    List<PosTerminal> findByWarehouseId(UUID warehouseId);
}
