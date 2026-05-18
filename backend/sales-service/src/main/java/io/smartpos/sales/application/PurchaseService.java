package io.smartpos.sales.application;

import io.smartpos.sales.api.dto.GoodsReceivedDto;
import io.smartpos.sales.api.dto.PurchaseDto;
import io.smartpos.sales.api.dto.SaleLineInput;
import io.smartpos.sales.domain.model.*;
import io.smartpos.sales.domain.repository.PurchasePaymentAppliedRepository;
import io.smartpos.sales.domain.repository.PurchaseRepository;
import io.smartpos.sales.infrastructure.feign.InventoryClient;
import io.smartpos.common.context.TenantContext;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.time.Year;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Purchase orders. On receipt, we call Inventory to increment stock via a
 * positive-delta adjustment tagged with the purchase ref.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class PurchaseService {

    private final PurchaseRepository repo;
    private final PurchasePaymentAppliedRepository appliedRepo;
    private final PricingEngine pricing;
    private final InventoryClient inventory;
    private final OutboxPublisher outbox;
    private final ProductNameResolver productNameResolver;

    @Transactional(readOnly = true)
    public Page<PurchaseDto> search(LocalDate from, LocalDate to, UUID supplierId,
                                    UUID warehouseId, PurchaseStatus status, Pageable p) {
        return repo.search(from, to, supplierId, warehouseId, status,
                TenantContext.get().orElse(null), p).map(PurchaseDto::from);
    }

    @Transactional(readOnly = true)
    public PurchaseDto get(UUID id) {
        return repo.findByIdWithLines(id).map(PurchaseDto::from)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Purchase not found"));
    }

    @Transactional
    public PurchaseDto create(PurchaseDto.CreateRequest req, UUID userId) {
        TaxMethod headerTaxMethod = req.taxMethod() == null ? TaxMethod.EXCLUSIVE : req.taxMethod();
        Purchase p = Purchase.builder()
                .ref(nextRef())
                .date(req.date() != null ? req.date() : LocalDate.now())
                .supplierId(req.supplierId())
                .warehouseId(req.warehouseId())
                .userId(userId)
                .status(PurchaseStatus.ORDERED)
                .taxMethod(headerTaxMethod)
                .currency(req.currency() != null ? req.currency() : "TZS")
                .exchangeRate(req.exchangeRate() != null ? req.exchangeRate() : BigDecimal.ONE)
                .shipping(nz(req.shipping()))
                .discountTotal(nz(req.discount()))
                .notes(req.notes())
                .tenantId(TenantContext.require())
                .build();

        BigDecimal sumSub = BigDecimal.ZERO, sumTax = BigDecimal.ZERO;
        for (SaleLineInput in : req.lines()) {
            TaxMethod lineTaxMethod = in.taxMethod() != null ? in.taxMethod() : headerTaxMethod;
            DiscountType dt = in.discountType() != null ? in.discountType() : DiscountType.FIXED;
            PricingEngine.LineCalc calc = pricing.calcLine(
                    in.unitPrice(), in.qty(), in.discount(), dt, in.taxRate(), lineTaxMethod);
            PurchaseLine line = PurchaseLine.builder()
                    .purchase(p)
                    .productId(in.productId()).variantId(in.variantId())
                    .productNameSnapshot(productNameResolver.resolve(in.productId(), in.productName()))
                    .productCodeSnapshot(in.productCode())
                    .unitCost(in.unitPrice()).qty(in.qty())
                    .discount(nz(in.discount())).discountType(dt)
                    .taxRate(nz(in.taxRate())).taxMethod(lineTaxMethod)
                    .lineSubtotal(calc.subtotal()).lineTax(calc.tax()).lineTotal(calc.total())
                    .build();
            p.getLines().add(line);
            sumSub = sumSub.add(calc.subtotal());
            sumTax = sumTax.add(calc.tax());
        }
        PricingEngine.DocCalc doc = pricing.calcDocument(sumSub, sumTax, req.discount(), req.shipping());
        p.setSubtotal(doc.subtotal()); p.setTaxTotal(doc.taxTotal());
        p.setDiscountTotal(doc.discountTotal()); p.setShipping(doc.shipping());
        p.setGrandTotal(doc.grandTotal());

        Purchase saved = repo.save(p);
        outbox.publish("Purchase", saved.getId(), "PurchaseOrdered", Map.of(
                "purchaseId", saved.getId(), "ref", saved.getRef(),
                "supplierId", saved.getSupplierId() == null ? "" : saved.getSupplierId().toString(),
                "grandTotal", saved.getGrandTotal()));
        return PurchaseDto.from(saved);
    }

    /** Receive purchase — increments Inventory and flips status to RECEIVED. */
    @Transactional
    public PurchaseDto receive(UUID id) {
        Purchase p = repo.findByIdWithLines(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Purchase not found"));
        if (p.getStatus() == PurchaseStatus.RECEIVED) return PurchaseDto.from(p);
        if (p.getStatus() == PurchaseStatus.CANCELLED) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Purchase is cancelled");
        }

        List<InventoryClient.AdjustmentLine> lines = p.getLines().stream()
                .map(l -> new InventoryClient.AdjustmentLine(l.getProductId(), l.getVariantId(), l.getQty(), l.getUnitCost()))
                .toList();
        try {
            inventory.createAdjustment(new InventoryClient.CreateAdjustmentRequest(
                    p.getWarehouseId(), p.getDate(),
                    "PURCHASE_IN " + p.getRef(),
                    "Stock-in from purchase " + p.getRef(),
                    lines));
        } catch (Exception e) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR,
                    "Inventory update failed: " + e.getMessage());
        }

        p.receive();
        outbox.publish("Purchase", p.getId(), "PurchaseReceived",
                Map.of("purchaseId", p.getId(), "ref", p.getRef()));
        return PurchaseDto.from(p);
    }

    @Transactional(readOnly = true)
    public Page<GoodsReceivedDto> listReceived(
            UUID supplierId, LocalDate dateFrom, LocalDate dateTo, Pageable pageable) {
        return repo.findReceived(TenantContext.get().orElse(null), supplierId, dateFrom, dateTo, pageable)
                .map(GoodsReceivedDto::from);
    }

    @Transactional
    public GoodsReceivedDto receiveLine(
            UUID purchaseId, UUID lineId, BigDecimal receivedQty) {
        Purchase p = repo.findByIdWithLines(purchaseId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                        "Purchase not found"));
        if (p.getStatus() == PurchaseStatus.CANCELLED) {
            throw new ResponseStatusException(HttpStatus.UNPROCESSABLE_ENTITY,
                    "Cannot receive against a cancelled purchase");
        }
        PurchaseLine line = p.getLines().stream()
                .filter(l -> l.getId().equals(lineId))
                .findFirst()
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                        "Line not found"));
        BigDecimal remaining = line.getQty().subtract(line.getReceivedQty());
        if (receivedQty.compareTo(remaining) > 0) {
            throw new ResponseStatusException(HttpStatus.UNPROCESSABLE_ENTITY,
                    "Cannot receive more than ordered. Remaining: " + remaining);
        }
        if (receivedQty.signum() <= 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Received quantity must be positive");
        }
        line.setReceivedQty(line.getReceivedQty().add(receivedQty));
        line.setReceivedAt(Instant.now());
        boolean allReceived = p.getLines().stream()
                .allMatch(l -> l.getReceivedQty().compareTo(l.getQty()) >= 0);
        if (allReceived) {
            p.receive();
        }
        return GoodsReceivedDto.from(repo.save(p));
    }

    /**
     * Cancel a purchase. Refused once stock has been received — reversing a
     * RECEIVED purchase would require an inventory back-out, which is a
     * deliberate operator action (return to supplier) handled separately.
     */
    @Transactional
    public PurchaseDto cancel(UUID id) {
        Purchase p = repo.findByIdWithLines(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Purchase not found"));
        if (p.getStatus() == PurchaseStatus.CANCELLED) return PurchaseDto.from(p);
        if (p.getStatus() == PurchaseStatus.RECEIVED) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "Cannot cancel a received purchase — issue a return to supplier instead");
        }
        if (p.getPaidTotal().signum() > 0) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "Cannot cancel a purchase with payments — refund first");
        }
        p.cancel();
        outbox.publish("Purchase", p.getId(), "PurchaseCancelled",
                Map.of("purchaseId", p.getId(), "ref", p.getRef()));
        return PurchaseDto.from(p);
    }

    /**
     * Hard-delete a purchase. Allowed only for DRAFT or CANCELLED orders that
     * never moved stock or payments.
     */
    @Transactional
    public void delete(UUID id) {
        Purchase p = repo.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Purchase not found"));
        if (p.getStatus() == PurchaseStatus.RECEIVED) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "Cannot delete a received purchase — cancel and return to supplier instead");
        }
        if (p.getPaidTotal().signum() > 0) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "Cannot delete a purchase with payments — refund first");
        }
        repo.delete(p);
        outbox.publish("Purchase", id, "PurchaseDeleted",
                Map.of("purchaseId", id, "ref", p.getRef()));
    }

    @Transactional
    public boolean applyPayment(UUID purchaseId, UUID paymentId, BigDecimal amount,
                                PurchasePaymentApplied.Source source) {
        if (paymentId == null) {
            log.warn("applyPayment for purchase {} called without paymentId — skipping idempotency check",
                    purchaseId);
            return doApplyPayment(purchaseId, amount);
        }
        try {
            appliedRepo.saveAndFlush(PurchasePaymentApplied.builder()
                    .paymentId(paymentId)
                    .purchaseId(purchaseId)
                    .amount(nz(amount))
                    .source(source)
                    .build());
        } catch (DataIntegrityViolationException dup) {
            log.info("Skipping duplicate payment {} on purchase {} (source={})", paymentId, purchaseId, source);
            return false;
        }
        return doApplyPayment(purchaseId, amount);
    }

    private boolean doApplyPayment(UUID purchaseId, BigDecimal amount) {
        Purchase p = repo.findById(purchaseId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Purchase not found"));
        p.setPaidTotal(p.getPaidTotal().add(nz(amount)));
        p.recomputePaymentStatus();
        return true;
    }

    private String nextRef() {
        String prefix = "PO-" + Year.now().getValue() + "-";
        long n = repo.countByRefStartingWith(prefix, TenantContext.get().orElse(null)) + 1;
        return prefix + String.format("%06d", n);
    }

    private static BigDecimal nz(BigDecimal v) { return v == null ? BigDecimal.ZERO : v; }
}
