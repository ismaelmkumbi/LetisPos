package io.smartpos.sales.api;

import io.smartpos.sales.api.dto.CreateSaleRequest;
import io.smartpos.sales.api.dto.DraftSaleDto;
import io.smartpos.sales.api.dto.SaleDto;
import io.smartpos.sales.api.dto.SaleLineInput;
import io.smartpos.sales.application.DraftSaleService;
import io.smartpos.sales.application.PricingEngine;
import io.smartpos.sales.application.SaleService;
import io.smartpos.sales.domain.model.DiscountType;
import io.smartpos.sales.domain.model.TaxMethod;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

/**
 * POS-specific fast paths.
 *
 * {@code POST /pos/sales} is end-to-end: reserve + commit in one call, which
 * mirrors a counter purchase where payment is taken immediately.
 *
 * {@code POST /pos/quote} lets the client calc totals client-side-style (tax,
 * discount, line totals) without persisting anything — keeps the cart UI fast.
 */
@RestController
@RequestMapping("/api/v1/pos")
@RequiredArgsConstructor
public class PosController {

    private final SaleService      sales;
    private final DraftSaleService drafts;
    private final PricingEngine    pricing;

    // ---- Fast path: create + reserve + commit in one call ----
    @PostMapping("/sales")
    @PreAuthorize("hasAuthority('pos.use')")
    public ResponseEntity<SaleDto> checkout(@Valid @RequestBody CreateSaleRequest req,
                                            @AuthenticationPrincipal Jwt jwt) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(sales.create(req, userIdFrom(jwt), true));
    }

    // ---- Live quote (no persistence) ----
    public record QuoteRequest(
            List<SaleLineInput> lines,
            BigDecimal discount,
            TaxMethod taxMethod,
            BigDecimal shipping) {}

    public record QuoteResponse(
            List<LineOut> lines,
            BigDecimal subtotal,
            BigDecimal taxTotal,
            BigDecimal discountTotal,
            BigDecimal shipping,
            BigDecimal grandTotal
    ) {
        public record LineOut(UUID productId, BigDecimal unitPrice, BigDecimal qty,
                              BigDecimal lineSubtotal, BigDecimal lineTax, BigDecimal lineTotal) {}
    }

    @PostMapping("/quote")
    @PreAuthorize("hasAuthority('pos.use') or hasAuthority('sale.create')")
    public QuoteResponse quote(@RequestBody QuoteRequest req) {
        TaxMethod hm = req.taxMethod() == null ? TaxMethod.EXCLUSIVE : req.taxMethod();
        BigDecimal sumSub = BigDecimal.ZERO, sumTax = BigDecimal.ZERO;
        List<QuoteResponse.LineOut> out = new ArrayList<>();
        if (req.lines() != null) {
            for (SaleLineInput l : req.lines()) {
                TaxMethod lm = l.taxMethod() != null ? l.taxMethod() : hm;
                DiscountType dt = l.discountType() != null ? l.discountType() : DiscountType.FIXED;
                PricingEngine.LineCalc c = pricing.calcLine(
                        l.unitPrice(), l.qty(), l.discount(), dt, l.taxRate(), lm);
                out.add(new QuoteResponse.LineOut(l.productId(), l.unitPrice(), l.qty(),
                        c.subtotal(), c.tax(), c.total()));
                sumSub = sumSub.add(c.subtotal());
                sumTax = sumTax.add(c.tax());
            }
        }
        PricingEngine.DocCalc doc = pricing.calcDocument(sumSub, sumTax, req.discount(), req.shipping());
        return new QuoteResponse(out, doc.subtotal(), doc.taxTotal(),
                doc.discountTotal(), doc.shipping(), doc.grandTotal());
    }

    // ---- Drafts ----

    @GetMapping("/drafts")
    @PreAuthorize("hasAuthority('pos.use')")
    public List<DraftSaleDto> myDrafts(@AuthenticationPrincipal Jwt jwt) {
        return drafts.listMine(userIdFrom(jwt));
    }

    @PostMapping("/drafts")
    @PreAuthorize("hasAuthority('pos.use')")
    public ResponseEntity<DraftSaleDto> saveDraft(@Valid @RequestBody DraftSaleDto.SaveRequest req,
                                                  @AuthenticationPrincipal Jwt jwt) {
        return ResponseEntity.status(HttpStatus.CREATED).body(drafts.save(req, userIdFrom(jwt)));
    }

    @GetMapping("/drafts/{id}")
    @PreAuthorize("hasAuthority('pos.use')")
    public DraftSaleDto getDraft(@PathVariable UUID id, @AuthenticationPrincipal Jwt jwt) {
        return drafts.get(id, userIdFrom(jwt));
    }

    @PutMapping("/drafts/{id}")
    @PreAuthorize("hasAuthority('pos.use')")
    public DraftSaleDto updateDraft(@PathVariable UUID id,
                                    @Valid @RequestBody DraftSaleDto.SaveRequest req,
                                    @AuthenticationPrincipal Jwt jwt) {
        return drafts.update(id, req, userIdFrom(jwt));
    }

    @DeleteMapping("/drafts/{id}")
    @PreAuthorize("hasAuthority('pos.use')")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteDraft(@PathVariable UUID id, @AuthenticationPrincipal Jwt jwt) {
        drafts.delete(id, userIdFrom(jwt));
    }

    private static UUID userIdFrom(Jwt jwt) { return jwt == null ? null : UUID.fromString(jwt.getSubject()); }
}
