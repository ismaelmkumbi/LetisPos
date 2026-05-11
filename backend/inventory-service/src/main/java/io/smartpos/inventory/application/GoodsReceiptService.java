package io.smartpos.inventory.application;

import io.smartpos.common.context.TenantContext;
import io.smartpos.inventory.api.dto.GoodsReceiptDto;
import io.smartpos.inventory.domain.model.*;
import io.smartpos.inventory.domain.repository.GoodsReceiptRepository;
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
public class GoodsReceiptService {

    private final GoodsReceiptRepository grRepo;
    private final WarehouseRepository           warehouseRepo;
    private final StockLevelRepository          stockRepo;
    private final StockMovementRepository       movementRepo;
    private final StockService                  stockService;
    private final OutboxPublisher               outbox;

    @Transactional(readOnly = true)
    public Page<GoodsReceiptDto> list(Pageable pageable) {
        return grRepo.findAll(pageable).map(GoodsReceiptDto::from);
    }

    @Transactional(readOnly = true)
    public GoodsReceiptDto get(UUID id) {
        return grRepo.findById(id).map(GoodsReceiptDto::from)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Goods receipt not found"));
    }

    /**
     * Create a new goods receipt in DRAFT status. No stock is affected yet.
     */
    @Transactional
    public GoodsReceiptDto create(GoodsReceiptDto.CreateGoodsReceiptRequest req) {
        warehouseRepo.findById(req.warehouseId()).orElseThrow(() ->
                new ResponseStatusException(HttpStatus.BAD_REQUEST, "warehouseId not found"));

        UUID tenantId = TenantContext.require();
        GoodsReceipt gr = GoodsReceipt.builder()
                .ref(nextRef())
                .purchaseId(req.purchaseId())
                .supplierId(req.supplierId())
                .warehouseId(req.warehouseId())
                .date(req.date() != null ? req.date() : LocalDate.now())
                .status("DRAFT")
                .notes(req.notes())
                .tenantId(tenantId)
                .build();
        req.lines().forEach(l -> {
            GoodsReceiptLine line = GoodsReceiptLine.builder()
                    .receipt(gr)
                    .productId(l.productId())
                    .variantId(l.variantId())
                    .orderedQty(l.orderedQty())
                    .receivedQty(l.receivedQty())
                    .unitCost(l.unitCost())
                    .build();
            gr.getLines().add(line);
        });
        GoodsReceipt saved = grRepo.save(gr);

        outbox.publish("GoodsReceipt", saved.getId(), "GoodsReceiptCreated",
                java.util.Map.of("goodsReceiptId", saved.getId(), "ref", saved.getRef(),
                                 "warehouseId", saved.getWarehouseId(), "lineCount", saved.getLines().size()));
        return GoodsReceiptDto.from(saved);
    }

    /**
     * Post the goods receipt: transitions status to POSTED, upserts stock for
     * each line by applying the received_qty delta, and records PURCHASE_IN
     * stock movements. All-or-nothing in a single transaction.
     */
    @Transactional
    public GoodsReceiptDto post(UUID id, UUID userId) {
        GoodsReceipt gr = grRepo.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Goods receipt not found"));
        if (!"DRAFT".equals(gr.getStatus())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Only DRAFT goods receipts can be posted. Current status: " + gr.getStatus());
        }

        UUID tenantId = TenantContext.require();

        for (GoodsReceiptLine line : gr.getLines()) {
            StockLevel s = stockService.upsert(line.getProductId(), line.getVariantId(), gr.getWarehouseId());
            try {
                s.applyDelta(line.getReceivedQty());
            } catch (IllegalStateException e) {
                throw new ResponseStatusException(HttpStatus.CONFLICT, e.getMessage());
            }
            stockRepo.save(s);

            movementRepo.save(StockMovement.builder()
                    .productId(line.getProductId()).variantId(line.getVariantId())
                    .warehouseId(gr.getWarehouseId())
                    .movementType(MovementType.PURCHASE_IN)
                    .qtyDelta(line.getReceivedQty())
                    .unitCost(line.getUnitCost())
                    .referenceType(ReferenceType.PURCHASE)
                    .referenceId(gr.getId())
                    .userId(userId)
                    .tenantId(tenantId)
                    .build());
        }

        gr.setStatus("POSTED");
        GoodsReceipt saved = grRepo.save(gr);

        outbox.publish("GoodsReceipt", saved.getId(), "GoodsReceiptPosted",
                java.util.Map.of("goodsReceiptId", saved.getId(), "ref", saved.getRef(),
                                 "warehouseId", saved.getWarehouseId(), "lineCount", saved.getLines().size()));
        return GoodsReceiptDto.from(saved);
    }

    private String nextRef() {
        String prefix = "GR-" + Year.now().getValue() + "-";
        long n = grRepo.countByRefStartingWith(prefix) + 1;
        return prefix + String.format("%06d", n);
    }
}
