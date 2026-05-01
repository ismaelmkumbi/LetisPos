package io.smartpos.sales.domain.repository;

import io.smartpos.sales.domain.model.OfflineOpId;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface OfflineOpIdRepository extends JpaRepository<OfflineOpId, UUID> {

    Optional<OfflineOpId> findByTerminalIdAndClientOpId(UUID terminalId, String clientOpId);
}
