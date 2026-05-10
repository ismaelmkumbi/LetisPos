package io.smartpos.sales.application;

import io.smartpos.common.context.TenantContext;
import io.smartpos.sales.api.dto.PurchaseReturnDto;
import io.smartpos.sales.domain.model.Purchase;
import io.smartpos.sales.domain.model.PurchaseReturn;
import io.smartpos.sales.domain.model.PurchaseReturnLine;
import io.smartpos.sales.domain.model.PurchaseStatus;
import io.smartpos.sales.domain.model.ReturnStatus;
import io.smartpos.sales.domain.repository.PurchaseRepository;
import io.smartpos.sales.domain.repository.PurchaseReturnRepository;
import io.smartpos.sales.infrastructure.feign.InventoryClient;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.Year;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Purchase returns — supplier-side counterpart of {@link SaleReturnService}.
 *
 * Creates a PurchaseReturn header/lines and removes the returned stock from
 * the warehouse via a NEGATIVE-delta Inventory adjustment, since we are
 * shipping product back to the supplier. The financial side (supplier credit
 * note / refund) is handled by Payment Service via the outbox event we emit;
 * we do NOT mutate the originating purchase's paidTotal here.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class PurchaseReturnService {

    private final PurchaseReturnRepository returnRepo;
    private final PurchaseRepository purchaseRepo;
    private final InventoryClient inventory;
    private final OutboxPublisher outbox;

    @Transactional(readOnly = true)
    public PurchaseReturnDto get(UUID id) {
        return returnRepo.findByIdWithLines(id).map(PurchaseReturnDto::from)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Purchase return not found"));
    }

    @Transactional(readOnly = true)
    public Page<PurchaseReturnDto> listForPurchase(UUID purchaseId, Pageable pageable) {
        return returnRepo.findByPurchaseIdOrderByDateDesc(
                purchaseId, TenantContext.require(), pageable
        ).map(PurchaseReturnDto::from);
    }

    @Transactional
    public PurchaseReturnDto create(UUID purchaseId, PurchaseReturnDto.CreateRequest req, UUID userId) {
        Purchase p = purchaseRepo.findByIdWithLines(purchaseId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Purchase not found"));
        if (p.getStatus() == PurchaseStatus.CANCELLED) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Cancelled purchase cannot be returned");
        }
        if (p.getStatus() != PurchaseStatus.RECEIVED) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "Only RECEIVED purchases can be returned");
        }

        PurchaseReturn ret = PurchaseReturn.builder()
                .ref(nextRef())
                .date(req.date() != null ? req.date() : LocalDate.now())
                .purchaseId(purchaseId)
                .supplierId(p.getSupplierId())
                .warehouseId(p.getWarehouseId())
                .userId(userId)
                .reason(req.reason())
                .status(ReturnStatus.CONFIRMED)
                .tenantId(TenantContext.require())
                .build();

        BigDecimal total = BigDecimal.ZERO;
        for (PurchaseReturnDto.LineInput in : req.lines()) {
            BigDecimal lineTotal = in.unitPrice().multiply(in.qty());
            PurchaseReturnLine line = PurchaseReturnLine.builder()
                    .purchaseReturn(ret)
                    .productId(in.productId()).variantId(in.variantId())
                    .productNameSnapshot(in.productName() != null ? in.productName() : in.productId().toString())
                    .unitPrice(in.unitPrice()).qty(in.qty())
                    .lineTotal(lineTotal)
                    .build();
            ret.getLines().add(line);
            total = total.add(lineTotal);
        }
        ret.setGrandTotal(total);

        PurchaseReturn saved = returnRepo.save(ret);

        // Pull stock OUT via a negative adjustment — the goods are leaving the
        // warehouse on their way back to the supplier.
        List<InventoryClient.AdjustmentLine> lines = saved.getLines().stream()
                .map(l -> new InventoryClient.AdjustmentLine(
                        l.getProductId(), l.getVariantId(), l.getQty().negate()))
                .toList();
        try {
            inventory.createAdjustment(new InventoryClient.CreateAdjustmentRequest(
                    saved.getWarehouseId(), saved.getDate(),
                    "PURCHASE_RETURN " + saved.getRef(),
                    "Stock-out for purchase return " + saved.getRef(),
                    lines));
        } catch (Exception e) {
            log.error("Failed to post inventory back-out for purchase return {}: {}",
                    saved.getId(), e.getMessage());
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR,
                    "Failed to update inventory: " + e.getMessage());
        }

        outbox.publish("PurchaseReturn", saved.getId(), "PurchaseReturned", Map.of(
                "returnId", saved.getId(),
                "purchaseId", purchaseId,
                "supplierId", saved.getSupplierId() == null ? "" : saved.getSupplierId().toString(),
                "grandTotal", saved.getGrandTotal()));
        return PurchaseReturnDto.from(saved);
    }

    private String nextRef() {
        String prefix = "PRT-" + Year.now().getValue() + "-";
        long n = returnRepo.countByRefStartingWith(prefix, TenantContext.require()) + 1;
        return prefix + String.format("%06d", n);
    }
}
