package io.smartpos.sales.application;

import io.smartpos.sales.api.dto.SaleReturnDto;
import io.smartpos.sales.domain.model.*;
import io.smartpos.sales.domain.repository.SaleRepository;
import io.smartpos.sales.domain.repository.SaleReturnRepository;
import io.smartpos.sales.infrastructure.feign.InventoryClient;
import io.smartpos.common.context.TenantContext;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
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
 * Sale returns.
 *
 * Creates a SaleReturn header/lines and puts the returned stock back into the
 * warehouse by posting a positive-delta ADJUSTMENT on Inventory Service. The
 * adjustment's reference_type will be ADJUSTMENT (not SALE_RETURN) because
 * Phase 3 didn't carry a distinct return-in movement type; we tag the reason
 * with the return ref for auditability.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class SaleReturnService {

    private final SaleReturnRepository returnRepo;
    private final SaleRepository saleRepo;
    private final InventoryClient inventory;
    private final OutboxPublisher outbox;
    private final ProductNameResolver productNameResolver;

    @Transactional(readOnly = true)
    public SaleReturnDto get(UUID id) {
        return returnRepo.findByIdWithLines(id).map(SaleReturnDto::from)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Return not found"));
    }

    /** Powers the top-level Returns index page on the frontend. */
    @Transactional(readOnly = true)
    public org.springframework.data.domain.Page<SaleReturnDto> search(
            LocalDate from, LocalDate to,
            UUID customerId, UUID warehouseId, ReturnStatus status,
            org.springframework.data.domain.Pageable pageable) {
        return returnRepo.search(from, to, customerId, warehouseId, status,
                TenantContext.get().orElse(null), pageable)
                .map(SaleReturnDto::from);
    }

    @Transactional
    public SaleReturnDto create(UUID saleId, SaleReturnDto.CreateRequest req, UUID userId) {
        Sale sale = saleRepo.findById(saleId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Sale not found"));
        if (sale.getStatus() == SaleStatus.CANCELLED) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Cancelled sale cannot be returned");
        }

        SaleReturn ret = SaleReturn.builder()
                .ref(nextRef())
                .date(req.date() != null ? req.date() : LocalDate.now())
                .saleId(saleId)
                .customerId(sale.getCustomerId())
                .warehouseId(sale.getWarehouseId())
                .userId(userId)
                .reason(req.reason())
                .status(ReturnStatus.CONFIRMED)
                .tenantId(TenantContext.require())
                .build();

        BigDecimal total = BigDecimal.ZERO;
        for (SaleReturnDto.LineInput in : req.lines()) {
            BigDecimal lineTotal = in.unitPrice().multiply(in.qty());
            SaleReturnLine line = SaleReturnLine.builder()
                    .saleReturn(ret)
                    .productId(in.productId()).variantId(in.variantId())
                    .productNameSnapshot(productNameResolver.resolve(in.productId(), in.productName()))
                    .unitPrice(in.unitPrice()).qty(in.qty())
                    .lineTotal(lineTotal)
                    .build();
            ret.getLines().add(line);
            total = total.add(lineTotal);
        }
        ret.setSubtotal(total);
        ret.setGrandTotal(total);

        SaleReturn saved = returnRepo.save(ret);

        // Push stock back via Inventory adjustment
        List<InventoryClient.AdjustmentLine> lines = saved.getLines().stream()
                .map(l -> new InventoryClient.AdjustmentLine(l.getProductId(), l.getVariantId(), l.getQty()))
                .toList();
        try {
            inventory.createAdjustment(new InventoryClient.CreateAdjustmentRequest(
                    saved.getWarehouseId(), saved.getDate(),
                    "SALE_RETURN " + saved.getRef(),
                    "Restock from sale return " + saved.getRef(),
                    lines));
        } catch (Exception e) {
            log.error("Failed to restock via adjustment for return {}: {}", saved.getId(), e.getMessage());
            // The return is already recorded — operator must reconcile manually.
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR,
                    "Failed to restock: " + e.getMessage());
        }

        outbox.publish("SaleReturn", saved.getId(), "SaleReturned", Map.of(
                "returnId", saved.getId(), "saleId", saleId,
                "grandTotal", saved.getGrandTotal()));
        return SaleReturnDto.from(saved);
    }

    private String nextRef() {
        String prefix = "SRT-" + Year.now().getValue() + "-";
        long n = returnRepo.countByRefStartingWith(prefix, TenantContext.get().orElse(null)) + 1;
        return prefix + String.format("%06d", n);
    }
}
