package io.smartpos.inventory.application;

import io.smartpos.common.context.TenantContext;
import io.smartpos.inventory.api.dto.AdjustmentDto;
import io.smartpos.inventory.api.dto.CreateDamageRequest;
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

import java.time.Instant;
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
        return adjRepo.search(warehouseId, from, to, TenantContext.get().orElse(null), p).map(AdjustmentDto::from);
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

        UUID tenantId = TenantContext.require();
        Adjustment a = Adjustment.builder()
                .ref(nextRef())
                .date(req.date() != null ? req.date() : LocalDate.now())
                .warehouseId(req.warehouseId())
                .userId(userId)
                .reason(req.reason())
                .notes(req.notes())
                .tenantId(tenantId)
                .build();
        req.lines().forEach(l -> {
            AdjustmentLine line = AdjustmentLine.builder()
                    .adjustment(a)
                    .productId(l.productId())
                    .variantId(l.variantId())
                    .qtyDelta(l.qtyDelta())
                    .unitCost(l.unitCost())
                    .build();
            a.getLines().add(line);
        });
        Adjustment saved = adjRepo.save(a);

        for (AdjustmentLine l : saved.getLines()) {
            StockLevel s = stockService.upsert(l.getProductId(), l.getVariantId(), a.getWarehouseId());
            // Recalculate WAC if this is a stock-in with a known unit cost (e.g. from purchase receipt)
            if (l.getQtyDelta().signum() > 0 && l.getUnitCost() != null && l.getUnitCost().signum() > 0) {
                s.recalculateWac(l.getQtyDelta(), l.getUnitCost());
            }
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
                    .tenantId(tenantId)
                    .build());
        }

        outbox.publish("Adjustment", a.getId(), "AdjustmentPosted",
                java.util.Map.of("adjustmentId", a.getId(), "ref", a.getRef(),
                                 "warehouseId", a.getWarehouseId(), "lineCount", a.getLines().size()));
        return AdjustmentDto.from(saved);
    }

    // ---- Damage & Waste ----

    /**
     * Record a damage or waste event. Creates a PENDING_REVIEW adjustment that
     * must be explicitly approved before stock is deducted — two-step workflow
     * that gives a reviewer the chance to verify or reject.
     */
    @Transactional
    public AdjustmentDto recordDamage(CreateDamageRequest req, UUID userId) {
        warehouseRepo.findById(req.warehouseId()).orElseThrow(() ->
                new ResponseStatusException(HttpStatus.BAD_REQUEST, "warehouseId not found"));

        UUID tenantId = TenantContext.require();
        Adjustment a = Adjustment.builder()
                .ref(nextRef())
                .date(LocalDate.now())
                .warehouseId(req.warehouseId())
                .userId(userId)
                .reason(req.movementType())          // "DAMAGE" or "WASTE" — used in approve to pick MovementType
                .reasonCode(req.reasonCode())
                .notes(req.notes())
                .status("PENDING_REVIEW")
                .tenantId(tenantId)
                .build();

        AdjustmentLine line = AdjustmentLine.builder()
                .adjustment(a)
                .productId(req.productId())
                .variantId(req.variantId())
                .qtyDelta(req.qty().negate())
                .build();
        a.getLines().add(line);

        Adjustment saved = adjRepo.save(a);

        outbox.publish("Adjustment", a.getId(), "DamageRecorded",
                java.util.Map.of("adjustmentId", a.getId(), "ref", a.getRef(),
                                 "warehouseId", a.getWarehouseId(), "movementType", req.movementType()));
        return AdjustmentDto.from(saved);
    }

    /**
     * Approve a pending damage/waste adjustment. Deducts stock for each line and
     * records the corresponding DAMAGE or WASTE stock movement.
     */
    @Transactional
    public AdjustmentDto approveDamage(UUID id, UUID userId) {
        Adjustment a = adjRepo.findByIdWithLines(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Adjustment not found"));
        if (!"PENDING_REVIEW".equals(a.getStatus())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Only PENDING_REVIEW adjustments can be approved");
        }

        UUID tenantId = TenantContext.require();

        // Movement type is derived from the reason field populated in recordDamage
        MovementType mType = "WASTE".equals(a.getReason()) ? MovementType.WASTE : MovementType.DAMAGE;

        for (AdjustmentLine line : a.getLines()) {
            StockLevel s = stockService.upsert(line.getProductId(), line.getVariantId(), a.getWarehouseId());
            try {
                s.applyDelta(line.getQtyDelta());
            } catch (IllegalStateException e) {
                throw new ResponseStatusException(HttpStatus.CONFLICT, e.getMessage());
            }
            stockRepo.save(s);

            movementRepo.save(StockMovement.builder()
                    .productId(line.getProductId()).variantId(line.getVariantId())
                    .warehouseId(a.getWarehouseId())
                    .movementType(mType)
                    .qtyDelta(line.getQtyDelta())
                    .referenceType(ReferenceType.ADJUSTMENT).referenceId(a.getId())
                    .userId(userId)
                    .notes("Damage/Waste approved: " + (a.getReasonCode() != null ? a.getReasonCode() : "N/A"))
                    .tenantId(tenantId)
                    .build());
        }

        a.setStatus("APPROVED");
        a.setApprovedBy(userId);
        a.setApprovedAt(Instant.now());

        Adjustment saved = adjRepo.save(a);

        outbox.publish("Adjustment", a.getId(), "DamageApproved",
                java.util.Map.of("adjustmentId", a.getId(), "ref", a.getRef(),
                                 "warehouseId", a.getWarehouseId(), "movementType", mType.name()));
        return AdjustmentDto.from(saved);
    }

    /**
     * Reject a pending damage/waste adjustment with a reason. No stock is
     * affected — the adjustment is simply marked as REJECTED for audit trail.
     */
    @Transactional
    public AdjustmentDto rejectDamage(UUID id, String reason) {
        Adjustment a = adjRepo.findByIdWithLines(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Adjustment not found"));
        if (!"PENDING_REVIEW".equals(a.getStatus())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Only PENDING_REVIEW adjustments can be rejected");
        }
        a.setStatus("REJECTED");
        a.setRejectedReason(reason);

        Adjustment saved = adjRepo.save(a);

        outbox.publish("Adjustment", a.getId(), "DamageRejected",
                java.util.Map.of("adjustmentId", a.getId(), "ref", a.getRef(), "reason", reason));
        return AdjustmentDto.from(saved);
    }

    private String nextRef() {
        long ts = System.currentTimeMillis() % 1_000_000;
        String suffix = UUID.randomUUID().toString().substring(0, 4);
        return "ADJ-" + Year.now().getValue() + "-" + ts + "-" + suffix;
    }
}
