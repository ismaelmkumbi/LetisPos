package io.smartpos.inventory.domain.repository;

import io.smartpos.inventory.domain.model.ReservationStatus;
import io.smartpos.inventory.domain.model.StockReservation;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface StockReservationRepository extends JpaRepository<StockReservation, UUID> {
    Optional<StockReservation> findBySaleId(UUID saleId);

    List<StockReservation> findByStatusAndExpiresAtBefore(ReservationStatus status, Instant cutoff);
}
