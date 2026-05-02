package io.smartpos.sales.application;

import io.smartpos.sales.api.dto.CreateSaleRequest;
import io.smartpos.sales.api.dto.QuotationDto;
import io.smartpos.sales.api.dto.SaleDto;
import io.smartpos.sales.api.dto.SaleLineInput;
import io.smartpos.sales.domain.model.*;
import io.smartpos.sales.domain.repository.QuotationRepository;
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
public class QuotationService {

    private final QuotationRepository repo;
    private final PricingEngine pricing;
    private final SaleService sales;
    private final OutboxPublisher outbox;

    @Transactional(readOnly = true)
    public Page<QuotationDto> search(LocalDate from, LocalDate to, UUID customerId,
                                     QuotationStatus status, Pageable p) {
        return repo.search(from, to, customerId, status, p).map(QuotationDto::from);
    }

    @Transactional(readOnly = true)
    public QuotationDto get(UUID id) {
        return repo.findByIdWithLines(id).map(QuotationDto::from)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Quotation not found"));
    }

    @Transactional
    public QuotationDto create(QuotationDto.CreateRequest req, UUID userId) {
        TaxMethod headerTaxMethod = req.taxMethod() == null ? TaxMethod.EXCLUSIVE : req.taxMethod();
        Quotation q = Quotation.builder()
                .ref(nextRef())
                .date(req.date() != null ? req.date() : LocalDate.now())
                .customerId(req.customerId())
                .warehouseId(req.warehouseId())
                .userId(userId)
                .status(QuotationStatus.DRAFT)
                .taxMethod(headerTaxMethod)
                .currency(req.currency() != null ? req.currency() : "TZS")
                .exchangeRate(req.exchangeRate() != null ? req.exchangeRate() : BigDecimal.ONE)
                .shipping(nz(req.shipping()))
                .discountTotal(nz(req.discount()))
                .notes(req.notes())
                .build();

        BigDecimal sumSub = BigDecimal.ZERO, sumTax = BigDecimal.ZERO;
        for (SaleLineInput in : req.lines()) {
            TaxMethod lineTaxMethod = in.taxMethod() != null ? in.taxMethod() : headerTaxMethod;
            DiscountType dt = in.discountType() != null ? in.discountType() : DiscountType.FIXED;
            PricingEngine.LineCalc calc = pricing.calcLine(
                    in.unitPrice(), in.qty(), in.discount(), dt, in.taxRate(), lineTaxMethod);
            QuotationLine line = QuotationLine.builder()
                    .quotation(q)
                    .productId(in.productId()).variantId(in.variantId())
                    .productNameSnapshot(in.productName() != null ? in.productName() : in.productId().toString())
                    .productCodeSnapshot(in.productCode())
                    .unitPrice(in.unitPrice()).qty(in.qty())
                    .discount(nz(in.discount())).discountType(dt)
                    .taxRate(nz(in.taxRate())).taxMethod(lineTaxMethod)
                    .lineSubtotal(calc.subtotal()).lineTax(calc.tax()).lineTotal(calc.total())
                    .build();
            q.getLines().add(line);
            sumSub = sumSub.add(calc.subtotal());
            sumTax = sumTax.add(calc.tax());
        }
        PricingEngine.DocCalc doc = pricing.calcDocument(sumSub, sumTax, req.discount(), req.shipping());
        q.setSubtotal(doc.subtotal()); q.setTaxTotal(doc.taxTotal());
        q.setDiscountTotal(doc.discountTotal()); q.setShipping(doc.shipping());
        q.setGrandTotal(doc.grandTotal());

        Quotation saved = repo.save(q);
        outbox.publish("Quotation", saved.getId(), "QuotationCreated",
                java.util.Map.of("quotationId", saved.getId(), "ref", saved.getRef(),
                                 "grandTotal", saved.getGrandTotal()));
        return QuotationDto.from(saved);
    }

    @Transactional
    public QuotationDto updateStatus(UUID id, QuotationStatus next) {
        Quotation q = repo.findByIdWithLines(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Quotation not found"));
        q.setStatus(next);
        return QuotationDto.from(repo.save(q));
    }

    /** Converts a quotation to a sale by creating a new sale + reserving stock. */
    @Transactional
    public SaleDto convertToSale(UUID quotationId, UUID userId) {
        Quotation q = repo.findByIdWithLines(quotationId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Quotation not found"));
        if (q.getStatus() == QuotationStatus.CONVERTED) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Already converted");
        }

        var saleLines = q.getLines().stream().map(l -> new SaleLineInput(
                l.getProductId(), l.getVariantId(),
                l.getProductNameSnapshot(), l.getProductCodeSnapshot(),
                l.getUnitPrice(), l.getQty(),
                l.getDiscount(), l.getDiscountType(),
                l.getTaxRate(), l.getTaxMethod()
        )).toList();

        CreateSaleRequest req = new CreateSaleRequest(
                LocalDate.now(), q.getCustomerId(), q.getWarehouseId(), saleLines,
                q.getDiscountTotal(), q.getTaxMethod(), q.getShipping(),
                q.getCurrency(), q.getExchangeRate(),
                "Converted from quotation " + q.getRef(),
                false);
        SaleDto sale = sales.create(req, userId, false);

        q.setStatus(QuotationStatus.CONVERTED);
        q.setConvertedSaleId(sale.id());
        repo.save(q);
        return sale;
    }

    private String nextRef() {
        String prefix = "QUO-" + Year.now().getValue() + "-";
        long n = repo.countByRefStartingWith(prefix) + 1;
        return prefix + String.format("%06d", n);
    }

    private static BigDecimal nz(BigDecimal v) { return v == null ? BigDecimal.ZERO : v; }
}
