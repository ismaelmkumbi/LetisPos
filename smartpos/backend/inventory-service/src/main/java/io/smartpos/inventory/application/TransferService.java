package io.smartpos.inventory.application;

import io.smartpos.inventory.api.dto.TransferDto;
import io.smartpos.inventory.domain.model.*;
import io.smartpos.inventory.domain.repository.StockLevelRepository;
import io.smartpos.inventory.domain.repository.StockMovementRepository;
import io.smartpos.inventory.domain.repository.TransferRepository;
import io.smartpos.inventory.domain.repository.WarehouseRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.Year;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class TransferService {

    private final TransferRepository   transferRepo;
    private final WarehouseRepository  warehouseRepo;
    private final StockLevelRepository stockRepo;
    private final StockMovementRepository movementRepo;
    private final StockService         stockService;
    private final OutboxPublisher      outbox;

    @Transactional(readOnly = true)
    public Page<TransferDto> search(TransferStatus status, LocalDate from, LocalDate to, Pageable p) {
        return transferRepo.search(status, from, to, p).map(TransferDto::from);
    }

    @Transactional(readOnly = true)
    public TransferDto get(UUID id) {
        return transferRepo.findByIdWithLines(id).map(TransferDto::from)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Transfer not found"));
    }

    @Transactional
    public TransferDto create(TransferDto.CreateRequest req, UUID userId) {
        warehouseRepo.findById(req.fromWarehouseId()).orElseThrow(() ->
                new ResponseStatusException(HttpStatus.BAD_REQUEST, "fromWarehouseId not found"));
        warehouseRepo.findById(req.toWarehouseId()).orElseThrow(() ->
                new ResponseStatusException(HttpStatus.BAD_REQUEST, "toWarehouseId not found"));
        if (req.fromWarehouseId().equals(req.toWarehouseId())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "from and to warehouses must differ");
        }

        Transfer t = Transfer.builder()
                .ref(nextRef())
                .date(req.date() != null ? req.date() : LocalDate.now())
                .fromWarehouseId(req.fromWarehouseId())
                .toWarehouseId(req.toWarehouseId())
                .userId(userId)
                .status(TransferStatus.DRAFT)
                .notes(req.notes())
                .build();
        req.lines().forEach(li -> t.getLines().add(TransferLine.builder()
                .productId(li.productId()).variantId(li.variantId())
                .qty(li.qty()).unitCost(li.unitCost())
                .build()));
        return TransferDto.from(transferRepo.save(t));
    }

    /**
     * Completes a DRAFT or IN_TRANSIT transfer: atomically decrements from-warehouse
     * stock and increments to-warehouse stock. Both legs are in the same Postgres tx
     * so if either fails, the whole transfer is rolled back.
     */
    @Transactional
    public TransferDto complete(UUID id, UUID userId) {
        Transfer t = transferRepo.findByIdWithLines(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Transfer not found"));
        if (t.getStatus() == TransferStatus.COMPLETED) return TransferDto.from(t);
        if (t.getStatus() == TransferStatus.CANCELLED) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Transfer is cancelled");
        }

        for (TransferLine line : t.getLines()) {
            // FROM: lock + deduct
            StockLevel from = stockRepo.findForUpdate(line.getProductId(), line.getVariantId(), t.getFromWarehouseId())
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.CONFLICT,
                            "No stock in from-warehouse for product=" + line.getProductId()));
            try { from.applyDelta(line.getQty().negate()); }
            catch (IllegalStateException e) {
                throw new ResponseStatusException(HttpStatus.CONFLICT, e.getMessage());
            }
            stockRepo.save(from);

            movementRepo.save(StockMovement.builder()
                    .productId(line.getProductId()).variantId(line.getVariantId())
                    .warehouseId(t.getFromWarehouseId())
                    .movementType(MovementType.TRANSFER_OUT)
                    .qtyDelta(line.getQty().negate())
                    .unitCost(line.getUnitCost())
                    .referenceType(ReferenceType.TRANSFER).referenceId(t.getId())
                    .userId(userId)
                    .build());

            // TO: upsert + add
            StockLevel to = stockService.upsert(line.getProductId(), line.getVariantId(), t.getToWarehouseId());
            to.applyDelta(line.getQty());
            stockRepo.save(to);

            movementRepo.save(StockMovement.builder()
                    .productId(line.getProductId()).variantId(line.getVariantId())
                    .warehouseId(t.getToWarehouseId())
                    .movementType(MovementType.TRANSFER_IN)
                    .qtyDelta(line.getQty())
                    .unitCost(line.getUnitCost())
                    .referenceType(ReferenceType.TRANSFER).referenceId(t.getId())
                    .userId(userId)
                    .build());
        }

        t.setStatus(TransferStatus.COMPLETED);
        Transfer saved = transferRepo.save(t);
        outbox.publish("Transfer", t.getId(), "TransferCompleted",
                java.util.Map.of("transferId", t.getId(), "ref", t.getRef(),
                                 "from", t.getFromWarehouseId(), "to", t.getToWarehouseId()));
        return TransferDto.from(saved);
    }

    private String nextRef() {
        String prefix = "TR-" + Year.now().getValue() + "-";
        long n = transferRepo.countByRefStartingWith(prefix) + 1;
        return prefix + String.format("%06d", n);
    }
}
