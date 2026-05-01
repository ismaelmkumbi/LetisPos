package io.smartpos.inventory.infrastructure.scheduler;

import io.smartpos.inventory.application.StockService;
import io.smartpos.inventory.domain.model.ReservationStatus;
import io.smartpos.inventory.domain.model.StockReservation;
import io.smartpos.inventory.domain.repository.StockReservationRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.util.List;

/**
 * Runs every 30 s and releases expired reservations that were never committed.
 * Each reservation is processed in its own tx (via StockService.expire) so one
 * slow / failing row doesn't hold up the rest.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class ReservationExpiryJob {

    private final StockReservationRepository reservationRepo;
    private final StockService stockService;

    @Scheduled(fixedDelay = 30_000L, initialDelay = 30_000L)
    public void sweep() {
        List<StockReservation> expired = reservationRepo
                .findByStatusAndExpiresAtBefore(ReservationStatus.ACTIVE, Instant.now());
        if (expired.isEmpty()) return;
        log.info("Expiring {} stock reservation(s)", expired.size());
        for (StockReservation r : expired) {
            try {
                stockService.expire(r.getId());
            } catch (Exception e) {
                log.warn("Failed to expire reservation {}: {}", r.getId(), e.getMessage());
            }
        }
    }
}
