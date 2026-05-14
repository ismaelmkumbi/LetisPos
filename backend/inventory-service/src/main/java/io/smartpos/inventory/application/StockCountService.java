package io.smartpos.inventory.application;

import io.smartpos.common.context.TenantContext;
import io.smartpos.inventory.api.dto.StockCountDto;
import io.smartpos.inventory.domain.model.*;
import io.smartpos.inventory.domain.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.Year;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class StockCountService {

    private final StockCountRepository   countRepo;
    private final WarehouseRepository    warehouseRepo;
    private final StockLevelRepository   stockRepo;
    private final StockMovementRepository movementRepo;
    private final StockService           stockService;
    private final OutboxPublisher        outbox;

    @Transactional(readOnly = true)
    public StockCountDto get(UUID id) {
        return countRepo.findByIdWithLines(id).map(StockCountDto::from)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Count not found"));
    }

    @Transactional
    public StockCountDto open(StockCountDto.CreateRequest req, UUID userId) {
        warehouseRepo.findById(req.warehouseId()).orElseThrow(() ->
                new ResponseStatusException(HttpStatus.BAD_REQUEST, "warehouseId not found"));
        StockCount c = StockCount.builder()
                .ref(nextRef())
                .warehouseId(req.warehouseId())
                .userId(userId)
                .status(StockCountStatus.OPEN)
                .notes(req.notes())
                .tenantId(TenantContext.require())
                .build();
        return StockCountDto.from(countRepo.save(c));
    }

    /**
     * Submit counted quantities. Captures each product's current system_qty as
     * a snapshot for auditability; the {@code difference} column is computed
     * by Postgres.
     */
    @Transactional
    public StockCountDto submitLines(UUID id, StockCountDto.SubmitLinesRequest req) {
        StockCount c = countRepo.findByIdWithLines(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Count not found"));
        if (c.getStatus() != StockCountStatus.OPEN) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Count is " + c.getStatus());
        }
        c.getLines().clear();
        UUID tenantId = TenantContext.require();
        for (StockCountDto.LineInput li : req.lines()) {
            StockLevel s = stockRepo.find(li.productId(), li.variantId(), c.getWarehouseId(), tenantId).orElse(null);
            BigDecimal systemQty = s == null ? BigDecimal.ZERO : s.getOnHand();
            c.getLines().add(StockCountLine.builder()
                    .productId(li.productId()).variantId(li.variantId())
                    .systemQty(systemQty).countedQty(li.countedQty())
                    .build());
        }
        return StockCountDto.from(countRepo.save(c));
    }

    /**
     * Posts the count: for every line where counted != system, apply the
     * difference as an ADJUSTMENT movement. Count is marked POSTED (immutable).
     */
    @Transactional
    public StockCountDto post(UUID id, UUID userId) {
        StockCount c = countRepo.findByIdWithLines(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Count not found"));
        if (c.getStatus() != StockCountStatus.OPEN) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Count is " + c.getStatus());
        }

        UUID tenantId = TenantContext.require();
        for (StockCountLine l : c.getLines()) {
            BigDecimal delta = l.getCountedQty().subtract(l.getSystemQty());
            if (delta.signum() == 0) continue;

            StockLevel s = stockService.upsert(l.getProductId(), l.getVariantId(), c.getWarehouseId());
            try { s.applyDelta(delta); }
            catch (IllegalStateException e) {
                throw new ResponseStatusException(HttpStatus.CONFLICT, e.getMessage());
            }
            stockRepo.save(s);

            movementRepo.save(StockMovement.builder()
                    .productId(l.getProductId()).variantId(l.getVariantId())
                    .warehouseId(c.getWarehouseId())
                    .movementType(MovementType.COUNT)
                    .qtyDelta(delta)
                    .referenceType(ReferenceType.COUNT).referenceId(c.getId())
                    .userId(userId)
                    .tenantId(tenantId)
                    .build());
        }

        c.setStatus(StockCountStatus.POSTED);
        c.setPostedAt(Instant.now());
        StockCount saved = countRepo.save(c);
        outbox.publish("StockCount", c.getId(), "StockCountPosted",
                java.util.Map.of("countId", c.getId(), "ref", c.getRef(),
                                 "warehouseId", c.getWarehouseId()));
        return StockCountDto.from(saved);
    }

    @Transactional(readOnly = true)
    public Page<StockCountDto.ListItem> list(String search, Pageable pageable) {
        String s = (search == null || search.isBlank()) ? "" : search;
        return countRepo.search(s, TenantContext.get().orElse(null), pageable)
                .map(c -> {
                    String whName = warehouseRepo.findById(c.getWarehouseId())
                            .map(Warehouse::getName)
                            .orElse(null);
                    return StockCountDto.ListItem.from(c, whName);
                });
    }

    private String nextRef() {
        String prefix = "CNT-" + Year.now().getValue() + "-";
        long n = countRepo.countByRefStartingWith(prefix) + 1;
        return prefix + String.format("%06d", n);
    }
}
