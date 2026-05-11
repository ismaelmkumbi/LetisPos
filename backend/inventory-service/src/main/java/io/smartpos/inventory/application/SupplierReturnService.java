package io.smartpos.inventory.application;

import io.smartpos.common.context.TenantContext;
import io.smartpos.inventory.api.dto.SupplierReturnDto;
import io.smartpos.inventory.domain.model.*;
import io.smartpos.inventory.domain.repository.StockLevelRepository;
import io.smartpos.inventory.domain.repository.StockMovementRepository;
import io.smartpos.inventory.domain.repository.SupplierReturnRepository;
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

/**
 * Supplier returns — record goods sent back to suppliers.
 *
 * Creating a DRAFT return does not affect stock. Only posting deducts stock
 * via {@code applyDelta(-qty)} and records RETURN_OUT movements.
 */
@Service
@RequiredArgsConstructor
public class SupplierReturnService {

    private final SupplierReturnRepository  srRepo;
    private final WarehouseRepository       warehouseRepo;
    private final StockLevelRepository      stockRepo;
    private final StockMovementRepository   movementRepo;
    private final StockService              stockService;
    private final OutboxPublisher           outbox;

    @Transactional(readOnly = true)
    public Page<SupplierReturnDto> list(Pageable pageable) {
        return srRepo.findAll(pageable).map(SupplierReturnDto::from);
    }

    @Transactional(readOnly = true)
    public SupplierReturnDto get(UUID id) {
        return srRepo.findById(id).map(SupplierReturnDto::from)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Supplier return not found"));
    }

    /**
     * Create a new supplier return in DRAFT status. No stock is affected yet.
     */
    @Transactional
    public SupplierReturnDto create(SupplierReturnDto.CreateSupplierReturnRequest req) {
        warehouseRepo.findById(req.warehouseId()).orElseThrow(() ->
                new ResponseStatusException(HttpStatus.BAD_REQUEST, "warehouseId not found"));

        UUID tenantId = TenantContext.require();
        SupplierReturn sr = SupplierReturn.builder()
                .ref(nextRef())
                .purchaseId(req.purchaseId())
                .supplierId(req.supplierId())
                .warehouseId(req.warehouseId())
                .date(req.date() != null ? req.date() : LocalDate.now())
                .status("DRAFT")
                .reason(req.reason())
                .reasonCode(req.reasonCode())
                .notes(req.notes())
                .tenantId(tenantId)
                .build();
        req.lines().forEach(l -> {
            SupplierReturnLine line = SupplierReturnLine.builder()
                    .returnRef(sr)
                    .productId(l.productId())
                    .variantId(l.variantId())
                    .qty(l.qty())
                    .unitCost(l.unitCost())
                    .reasonCode(l.reasonCode())
                    .build();
            sr.getLines().add(line);
        });
        SupplierReturn saved = srRepo.save(sr);

        outbox.publish("SupplierReturn", saved.getId(), "SupplierReturnCreated",
                java.util.Map.of("supplierReturnId", saved.getId(), "ref", saved.getRef(),
                                 "warehouseId", saved.getWarehouseId(), "lineCount", saved.getLines().size()));
        return SupplierReturnDto.from(saved);
    }

    /**
     * Post the supplier return: transitions status to POSTED, deducts stock for
     * each line via {@code applyDelta(-qty)}, and records RETURN_OUT stock
     * movements. All-or-nothing in a single transaction.
     */
    @Transactional
    public SupplierReturnDto post(UUID id, UUID userId) {
        SupplierReturn sr = srRepo.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Supplier return not found"));
        if (!"DRAFT".equals(sr.getStatus())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Only DRAFT supplier returns can be posted. Current status: " + sr.getStatus());
        }

        UUID tenantId = TenantContext.require();

        for (SupplierReturnLine line : sr.getLines()) {
            StockLevel s = stockService.upsert(line.getProductId(), line.getVariantId(), sr.getWarehouseId());
            try {
                s.applyDelta(line.getQty().negate());
            } catch (IllegalStateException e) {
                throw new ResponseStatusException(HttpStatus.CONFLICT, e.getMessage());
            }
            stockRepo.save(s);

            movementRepo.save(StockMovement.builder()
                    .productId(line.getProductId()).variantId(line.getVariantId())
                    .warehouseId(sr.getWarehouseId())
                    .movementType(MovementType.RETURN_OUT)
                    .qtyDelta(line.getQty().negate())
                    .unitCost(line.getUnitCost())
                    .referenceType(ReferenceType.PURCHASE_RETURN)
                    .referenceId(sr.getId())
                    .userId(userId)
                    .tenantId(tenantId)
                    .build());
        }

        sr.setStatus("POSTED");
        SupplierReturn saved = srRepo.save(sr);

        outbox.publish("SupplierReturn", saved.getId(), "SupplierReturnPosted",
                java.util.Map.of("supplierReturnId", saved.getId(), "ref", saved.getRef(),
                                 "warehouseId", saved.getWarehouseId(), "lineCount", saved.getLines().size()));
        return SupplierReturnDto.from(saved);
    }

    private String nextRef() {
        String prefix = "SR-" + Year.now().getValue() + "-";
        long n = srRepo.countByRefStartingWith(prefix) + 1;
        return prefix + String.format("%06d", n);
    }
}
