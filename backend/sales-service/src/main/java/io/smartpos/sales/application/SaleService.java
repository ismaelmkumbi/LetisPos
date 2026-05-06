package io.smartpos.sales.application;

import io.smartpos.sales.api.dto.CreateSaleRequest;
import io.smartpos.sales.api.dto.SaleDto;
import io.smartpos.sales.api.dto.SaleLineInput;
import io.smartpos.sales.domain.model.*;
import io.smartpos.sales.domain.repository.SalePaymentAppliedRepository;
import io.smartpos.sales.domain.repository.SaleRepository;
import io.smartpos.sales.infrastructure.feign.InventoryClient;
import io.smartpos.common.context.TenantContext;
import jakarta.persistence.EntityManager;
import org.springframework.dao.DataIntegrityViolationException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.Year;
import java.util.*;

/**
 * Sale lifecycle with the Inventory reservation saga.
 *
 * Creation flow (POST /sales or POST /pos/sales):
 *   1. Compute all line totals + document totals (PricingEngine).
 *   2. Persist Sale in DRAFT state (@Transactional — inside one local tx).
 *   3. Call Inventory Service POST /stock/reservations (Feign, JWT forwarded).
 *      3a. On failure → throw 409; the local tx rolls back, no Sale row remains.
 *      3b. On success → mark CONFIRMED, write SaleConfirmed event to outbox.
 *   4. For POS fast path, also call Inventory commit in the same flow.
 *
 * Cancellation:
 *   1. Call Inventory release (idempotent on their side).
 *   2. Flip status to CANCELLED, emit SaleCancelled.
 *
 * NOTE: Because step 3 is a remote call made AFTER step 2, this is a classic
 * distributed saga. If the remote call succeeds but the local commit fails
 * (extremely rare — both sides have committed their txs here), we'd leak a
 * reservation. The expiry sweeper on Inventory cleans those up after TTL.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class SaleService {

    private final SaleRepository   saleRepo;
    private final PricingEngine    pricing;
    private final InventoryClient  inventory;
    private final OutboxPublisher  outbox;
    private final SalePaymentAppliedRepository appliedRepo;
    private final EntityManager em;

    @Value("${smartpos.sales.default-currency:TZS}")
    private String defaultCurrency;

    @Value("${smartpos.sales.reservation-ttl-minutes:10}")
    private int reservationTtlMinutes;

    // ---------- Queries ----------

    @Transactional(readOnly = true)
    public Page<SaleDto> search(LocalDate from, LocalDate to, UUID customerId,
                                UUID warehouseId, SaleStatus status, Pageable p) {
        UUID tenantId = TenantContext.require();
        Map<String, Object> params = new LinkedHashMap<>();
        params.put("tenantId", tenantId);

        StringBuilder where = new StringBuilder(" FROM Sale s WHERE s.tenantId = :tenantId");
        if (from != null) {
            where.append(" AND s.date >= :dateFrom");
            params.put("dateFrom", from);
        }
        if (to != null) {
            where.append(" AND s.date <= :dateTo");
            params.put("dateTo", to);
        }
        if (customerId != null) {
            where.append(" AND s.customerId = :customerId");
            params.put("customerId", customerId);
        }
        if (warehouseId != null) {
            where.append(" AND s.warehouseId = :warehouseId");
            params.put("warehouseId", warehouseId);
        }
        if (status != null) {
            where.append(" AND s.status = :status");
            params.put("status", status);
        }

        Long total = bind(em.createQuery("SELECT COUNT(s)" + where, Long.class), params)
                .getSingleResult();
        if (total == 0) {
            return new PageImpl<>(List.of(), p, 0);
        }

        var idQuery = bind(em.createQuery("SELECT s.id" + where + orderBy(p), UUID.class), params);
        if (p.isPaged()) {
            idQuery.setFirstResult((int) p.getOffset());
            idQuery.setMaxResults(p.getPageSize());
        }
        List<UUID> ids = idQuery.getResultList();
        if (ids.isEmpty()) {
            return new PageImpl<>(List.of(), p, total);
        }

        List<Sale> rows = em.createQuery("""
                SELECT DISTINCT s FROM Sale s
                LEFT JOIN FETCH s.lines
                WHERE s.id IN :ids
                """, Sale.class)
                .setParameter("ids", ids)
                .getResultList();
        Map<UUID, Sale> byId = new HashMap<>();
        rows.forEach(s -> byId.put(s.getId(), s));

        List<SaleDto> content = ids.stream()
                .map(byId::get)
                .filter(Objects::nonNull)
                .map(SaleDto::from)
                .toList();
        return new PageImpl<>(content, p, total);
    }

    private static <T> jakarta.persistence.TypedQuery<T> bind(
            jakarta.persistence.TypedQuery<T> query, Map<String, Object> params) {
        params.forEach(query::setParameter);
        return query;
    }

    private static String orderBy(Pageable pageable) {
        List<String> clauses = new ArrayList<>();
        Sort sort = pageable.getSortOr(Sort.by(Sort.Order.desc("date"), Sort.Order.desc("createdAt")));
        for (Sort.Order order : sort) {
            String property = switch (order.getProperty()) {
                case "date", "createdAt", "confirmedAt", "ref", "grandTotal", "status" -> order.getProperty();
                default -> null;
            };
            if (property != null) {
                clauses.add("s." + property + " " + order.getDirection().name());
            }
        }
        if (clauses.isEmpty()) {
            clauses.add("s.date DESC");
            clauses.add("s.createdAt DESC");
        }
        clauses.add("s.id ASC");
        return " ORDER BY " + String.join(", ", clauses);
    }

    @Transactional(readOnly = true)
    public SaleDto get(UUID id) {
        UUID tenantId = TenantContext.require();
        return saleRepo.findByIdWithLines(id)
                .filter(s -> tenantId.equals(s.getTenantId()))
                .map(SaleDto::from)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Sale not found"));
    }

    // ---------- Create & confirm (back-office) ----------

    /**
     * Create + reserve stock atomically. The sale becomes CONFIRMED on success.
     * Payment is tracked separately (starts as UNPAID).
     */
    @Transactional
    public SaleDto create(CreateSaleRequest req, UUID userId, boolean isPosFastPath) {
        TaxMethod headerTaxMethod = req.taxMethod() == null ? TaxMethod.EXCLUSIVE : req.taxMethod();
        Sale sale = Sale.builder()
                .ref(nextRef())
                .date(req.date() != null ? req.date() : LocalDate.now())
                .customerId(req.customerId())
                .warehouseId(req.warehouseId())
                .userId(userId)
                .pos(Boolean.TRUE.equals(req.isPos()) || isPosFastPath)
                .taxMethod(headerTaxMethod)
                .currency(req.currency() != null ? req.currency() : defaultCurrency)
                .exchangeRate(req.exchangeRate() != null ? req.exchangeRate() : BigDecimal.ONE)
                .shipping(nz(req.shipping()))
                .discountTotal(nz(req.discount()))
                .notes(req.notes())
                .tenantId(TenantContext.require())
                .build();

        BigDecimal sumSubtotal = BigDecimal.ZERO;
        BigDecimal sumTax      = BigDecimal.ZERO;

        for (SaleLineInput in : req.lines()) {
            TaxMethod lineTaxMethod = in.taxMethod() != null ? in.taxMethod() : headerTaxMethod;
            DiscountType dt = in.discountType() != null ? in.discountType() : DiscountType.FIXED;
            PricingEngine.LineCalc calc = pricing.calcLine(
                    in.unitPrice(), in.qty(), in.discount(), dt, in.taxRate(), lineTaxMethod);

            SaleLine line = SaleLine.builder()
                    .sale(sale)
                    .productId(in.productId()).variantId(in.variantId())
                    .productNameSnapshot(in.productName() != null ? in.productName() : in.productId().toString())
                    .productCodeSnapshot(in.productCode())
                    .unitPrice(in.unitPrice()).qty(in.qty())
                    .discount(nz(in.discount())).discountType(dt)
                    .taxRate(nz(in.taxRate())).taxMethod(lineTaxMethod)
                    .lineSubtotal(calc.subtotal()).lineTax(calc.tax()).lineTotal(calc.total())
                    .build();
            sale.getLines().add(line);
            sumSubtotal = sumSubtotal.add(calc.subtotal());
            sumTax      = sumTax.add(calc.tax());
        }

        PricingEngine.DocCalc doc = pricing.calcDocument(sumSubtotal, sumTax, req.discount(), req.shipping());
        sale.setSubtotal(doc.subtotal());
        sale.setTaxTotal(doc.taxTotal());
        sale.setDiscountTotal(doc.discountTotal());
        sale.setShipping(doc.shipping());
        sale.setGrandTotal(doc.grandTotal());

        Sale saved = saleRepo.save(sale);

        // ---- reserve stock via Inventory saga ----
        List<InventoryClient.ReservationLine> reservationLines = saved.getLines().stream()
                .map(l -> new InventoryClient.ReservationLine(
                        l.getProductId(), l.getVariantId(), saved.getWarehouseId(), l.getQty()))
                .toList();
        try {
            inventory.reserve(new InventoryClient.ReserveRequest(
                    saved.getId(), reservationLines, reservationTtlMinutes));
        } catch (Exception e) {
            log.warn("Stock reservation failed for sale {}: {}", saved.getId(), e.getMessage());
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "Could not reserve stock: " + e.getMessage());
        }

        saved.confirm();
        outbox.publish("Sale", saved.getId(), "SaleConfirmed", saleEventPayload(saved));

        // POS fast path commits immediately (payment already taken at counter)
        if (isPosFastPath) {
            try {
                inventory.commit(saved.getId());
                saved.setPaidTotal(saved.getGrandTotal());
                saved.recomputePaymentStatus();
                outbox.publish("Sale", saved.getId(), "SaleCompleted",
                        Map.of("saleId", saved.getId(), "ref", saved.getRef()));
            } catch (Exception e) {
                log.error("POS commit failed for sale {} — will need manual reconciliation", saved.getId(), e);
                // Keep the sale CONFIRMED; operator can retry commit or cancel.
                throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR,
                        "Stock commit failed: " + e.getMessage());
            }
        }
        return SaleDto.from(saved);
    }

    // ---------- Commit (finalise after payment arrives) ----------

    @Transactional
    public SaleDto commit(UUID saleId, UUID userId) {
        Sale sale = saleRepo.findByIdWithLines(saleId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Sale not found"));
        if (sale.getStatus() != SaleStatus.CONFIRMED) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Sale is " + sale.getStatus());
        }
        try {
            inventory.commit(saleId);
        } catch (Exception e) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR,
                    "Stock commit failed: " + e.getMessage());
        }
        outbox.publish("Sale", saleId, "SaleCompleted",
                Map.of("saleId", saleId, "ref", sale.getRef()));
        return SaleDto.from(sale);
    }

    // ---------- Cancel ----------

    @Transactional
    public SaleDto cancel(UUID saleId) {
        Sale sale = saleRepo.findByIdWithLines(saleId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Sale not found"));
        if (sale.getStatus() == SaleStatus.CANCELLED) return SaleDto.from(sale);
        if (sale.getStatus() == SaleStatus.RETURNED) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Sale is RETURNED");
        }
        if (sale.getPaidTotal().signum() > 0) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "Cannot cancel a paid sale — create a sale return instead");
        }
        try {
            inventory.release(saleId);
        } catch (Exception e) {
            // Best-effort. Inventory's expiry sweeper will catch it.
            log.warn("Stock release failed for sale {}: {}", saleId, e.getMessage());
        }
        sale.cancel();
        outbox.publish("Sale", saleId, "SaleCancelled",
                Map.of("saleId", saleId, "ref", sale.getRef()));
        return SaleDto.from(sale);
    }

    // ---------- Payment reconciliation ----------

    /**
     * Applies a Payment Service payment to this sale, exactly once. Returns
     * {@code true} if the bump was applied, {@code false} if a previous call
     * already recorded the same {@code paymentId}.
     *
     * <p>Two callers race for this row:
     * <ul>
     *   <li>{@code POST /sales/{id}/apply-payment} — synchronous Feign callback
     *       fired by Payment Service inside its create flow.</li>
     *   <li>{@code PaymentEventsConsumer} — Kafka {@code PaymentReceived}
     *       fallback when the Feign call failed.</li>
     * </ul>
     * Whichever one inserts {@code sale_payments_applied} first wins; the other
     * sees a {@link DataIntegrityViolationException} and exits silently.
     */
    @Transactional
    public boolean applyPayment(UUID saleId, UUID paymentId, BigDecimal amount,
                                SalePaymentApplied.Source source) {
        if (paymentId == null) {
            // Legacy callers without an ID — keep the old behaviour but don't dedup.
            log.warn("applyPayment for sale {} called without paymentId — skipping idempotency check",
                    saleId);
            return doApply(saleId, amount);
        }
        try {
            appliedRepo.saveAndFlush(SalePaymentApplied.builder()
                    .paymentId(paymentId)
                    .saleId(saleId)
                    .amount(nz(amount))
                    .source(source)
                    .build());
        } catch (DataIntegrityViolationException dup) {
            log.info("Skipping duplicate payment {} on sale {} (source={})", paymentId, saleId, source);
            return false;
        }
        return doApply(saleId, amount);
    }

    private boolean doApply(UUID saleId, BigDecimal amount) {
        Sale sale = saleRepo.findById(saleId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Sale not found"));
        sale.setPaidTotal(sale.getPaidTotal().add(nz(amount)));
        sale.recomputePaymentStatus();
        return true;
    }

    // ---------- helpers ----------

    String nextRef() {
        String prefix = "INV-" + Year.now().getValue() + "-";
        long n = saleRepo.countByRefStartingWith(prefix, TenantContext.require()) + 1;
        return prefix + String.format("%06d", n);
    }

    private static BigDecimal nz(BigDecimal v) { return v == null ? BigDecimal.ZERO : v; }

    /**
     * Rich payload consumed by Report Service's fact_sales_daily and (Phase 6c)
     * fact_product_sales_daily projections. All fields are nullable-safe
     * (events must be self-describing).
     */
    private static Map<String, Object> saleEventPayload(Sale s) {
        Map<String, Object> m = new java.util.HashMap<>();
        m.put("saleId",        s.getId().toString());
        m.put("ref",           s.getRef());
        m.put("date",          s.getDate().toString());
        m.put("warehouseId",   s.getWarehouseId() == null ? null : s.getWarehouseId().toString());
        m.put("userId",        s.getUserId()      == null ? null : s.getUserId().toString());
        m.put("customerId",    s.getCustomerId()  == null ? null : s.getCustomerId().toString());
        m.put("tenantId",      s.getTenantId()    == null ? null : s.getTenantId().toString());
        m.put("grossTotal",    s.getGrandTotal());
        m.put("taxTotal",      s.getTaxTotal());
        m.put("discountTotal", s.getDiscountTotal());
        m.put("netTotal",      nz(s.getGrandTotal()).subtract(nz(s.getDiscountTotal())));
        m.put("currency",      s.getCurrency());

        // Per-line breakdown — drives fact_product_sales_daily.
        java.util.List<Map<String, Object>> lines = new java.util.ArrayList<>(s.getLines().size());
        for (SaleLine ln : s.getLines()) {
            Map<String, Object> l = new java.util.HashMap<>();
            l.put("productId", ln.getProductId() == null ? null : ln.getProductId().toString());
            l.put("variantId", ln.getVariantId() == null ? null : ln.getVariantId().toString());
            l.put("qty",       ln.getQty());
            l.put("gross",     ln.getLineSubtotal());
            l.put("tax",       ln.getLineTax());
            l.put("net",       ln.getLineTotal());
            lines.add(l);
        }
        m.put("lines", lines);
        return m;
    }
}
