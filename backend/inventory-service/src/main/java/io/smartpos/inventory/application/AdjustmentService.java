package io.smartpos.inventory.application;

import io.smartpos.inventory.api.dto.AdjustmentDto;
import io.smartpos.inventory.domain.model.*;
import io.smartpos.inventory.domain.repository.AdjustmentRepository;
import io.smartpos.inventory.domain.repository.StockLevelRepository;
import io.smartpos.inventory.domain.repository.StockMovementRepository;
import io.smartpos.inventory.domain.repository.WarehouseRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.time.Year;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class AdjustmentService {

    private final AdjustmentRepository   adjRepo;
    private final WarehouseRepository    warehouseRepo;
    private final StockLevelRepository   stockRepo;
    private final StockMovementRepository movementRepo;
    private final StockService           stockService;
    private final OutboxPublisher        outbox;

    @Transactional(readOnly = true)
    public Page<AdjustmentDto> search(UUID warehouseId, LocalDate from, LocalDate to, Pageable p) {
        return adjRepo.search(warehouseId, from, to, p).map(AdjustmentDto::from);
    }

    @Transactional(readOnly = true)
    public AdjustmentDto get(UUID id) {
        return adjRepo.findByIdWithLines(id).map(AdjustmentDto::from)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Adjustment not found"));
    }

    /**
     * An adjustment applies signed deltas to on_hand for each line and records
     * the movement. Applied in one tx — all-or-nothing.
     */
    @Transactional
    public AdjustmentDto create(AdjustmentDto.CreateRequest req, UUID userId) {
        warehouseRepo.findById(req.warehouseId()).orElseThrow(() ->
                new ResponseStatusException(HttpStatus.BAD_REQUEST, "warehouseId not found"));

        Adjustment a = Adjustment.builder()
                .ref(nextRef())
                .date(req.date() != null ? req.date() : LocalDate.now())
                .warehouseId(req.warehouseId())
                .userId(userId)
                .reason(req.reason())
                .notes(req.notes())
                .build();
        req.lines().forEach(l -> {
            AdjustmentLine line = AdjustmentLine.builder()
                    .adjustment(a)
                    .productId(l.productId())
                    .variantId(l.variantId())
                    .qtyDelta(l.qtyDelta())
                    .build();
            a.getLines().add(line);
        });
        Adjustment saved = adjRepo.save(a);

        for (AdjustmentLine l : saved.getLines()) {
            StockLevel s = stockService.upsert(l.getProductId(), l.getVariantId(), a.getWarehouseId());
            try { s.applyDelta(l.getQtyDelta()); }
            catch (IllegalStateException e) {
                throw new ResponseStatusException(HttpStatus.CONFLICT, e.getMessage());
            }
            stockRepo.save(s);

            movementRepo.save(StockMovement.builder()
                    .productId(l.getProductId()).variantId(l.getVariantId())
                    .warehouseId(a.getWarehouseId())
                    .movementType(MovementType.ADJUSTMENT)
                    .qtyDelta(l.getQtyDelta())
                    .referenceType(ReferenceType.ADJUSTMENT).referenceId(a.getId())
                    .userId(userId).notes(a.getReason())
                    .build());
        }

        outbox.publish("Adjustment", a.getId(), "AdjustmentPosted",
                java.util.Map.of("adjustmentId", a.getId(), "ref", a.getRef(),
                                 "warehouseId", a.getWarehouseId(), "lineCount", a.getLines().size()));
        return AdjustmentDto.from(saved);
    }

    private String nextRef() {
        String prefix = "ADJ-" + Year.now().getValue() + "-";
        long n = adjRepo.countByRefStartingWith(prefix) + 1;
        return prefix + String.format("%06d", n);
    }
}
