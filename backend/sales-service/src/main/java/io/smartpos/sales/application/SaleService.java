package io.smartpos.sales.application;

import io.smartpos.sales.api.SaleController;
import io.smartpos.sales.api.dto.CreateSaleRequest;
import io.smartpos.sales.api.dto.SaleDto;
import io.smartpos.sales.api.dto.SaleLineInput;
import io.smartpos.sales.api.dto.SalesByUserDto;
import io.smartpos.sales.domain.model.*;
import io.smartpos.sales.domain.repository.PurchaseRepository;
import io.smartpos.sales.domain.repository.SalePaymentAppliedRepository;
import io.smartpos.sales.domain.repository.SaleRepository;
import io.smartpos.sales.infrastructure.feign.InventoryClient;
import io.smartpos.sales.infrastructure.feign.ProductClient;
import io.smartpos.sales.infrastructure.feign.UserFeign;
import io.smartpos.common.context.TenantContext;
import org.springframework.security.core.context.SecurityContextHolder;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.JsonNode;
import feign.FeignException;
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
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.Year;
import java.util.*;
import java.util.stream.Collectors;

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

    private static final ObjectMapper objectMapper = new ObjectMapper();

    private final SaleRepository   saleRepo;
    private final PurchaseRepository purchaseRepo;
    private final PricingEngine    pricing;
    private final InventoryClient  inventory;
    private final OutboxPublisher  outbox;
    private final SalePaymentAppliedRepository appliedRepo;
    private final EntityManager em;
    private final UserFeign userFeign;
    private final ProductNameResolver productNameResolver;
    private final ProductClient productClient;
    private final TransactionTemplate txTemplate;

    @Value("${smartpos.sales.default-currency:TZS}")
    private String defaultCurrency;

    @Value("${smartpos.sales.reservation-ttl-minutes:10}")
    private int reservationTtlMinutes;

    // ---------- Queries ----------

    @Transactional(readOnly = true)
    public Page<SaleDto> search(LocalDate from, LocalDate to, UUID customerId,
                                UUID warehouseId, SaleStatus status, String ref, Pageable p) {
        boolean isSuperAdmin = isSuperAdmin();
        UUID tenantId = isSuperAdmin ? null : TenantContext.get().orElse(null);
        Map<String, Object> params = new LinkedHashMap<>();

        StringBuilder where = new StringBuilder(" FROM Sale s WHERE 1=1");
        if (!isSuperAdmin) {
            where.append(" AND s.tenantId = :tenantId");
            params.put("tenantId", tenantId);
        }
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
        if (ref != null && !ref.isBlank()) {
            where.append(" AND LOWER(s.ref) LIKE LOWER(CONCAT('%', :ref, '%'))");
            params.put("ref", ref);
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
        UUID tenantId = TenantContext.get().orElse(null);
        return saleRepo.findByIdWithLines(id)
                .filter(s -> tenantId.equals(s.getTenantId()))
                .map(SaleDto::from)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Sale not found"));
    }

    @Transactional(readOnly = true)
    public List<SalesByUserDto> salesByUser(LocalDate from, LocalDate to) {
        var stats = saleRepo.findSalesByUser(TenantContext.get().orElse(null), from, to);
        if (stats.isEmpty()) return List.of();

        // Resolve user names via user-service
        final Map<UUID, String> names = resolveUserNames(stats);
        return stats.stream().map(s -> {
            String name = names.getOrDefault(s.userId(),
                    "User " + s.userId().toString().substring(0, 8));
            return new SalesByUserDto(
                    s.userId(), name, s.saleCount(),
                    s.totalNet(), s.totalGross(), s.itemsSold());
        }).toList();
    }

    private Map<UUID, String> resolveUserNames(List<SalesByUserDto> stats) {
        try {
            var userIds = stats.stream()
                    .map(SalesByUserDto::userId)
                    .distinct()
                    .toList();
            var users = userFeign.getUsersByIds(userIds);
            return users.stream()
                    .collect(Collectors.toMap(
                            UserFeign.UserRef::id,
                            u -> u.firstName() + " " + u.lastName()));
        } catch (Exception e) {
            log.warn("Failed to resolve user names for sales-by-user: {}", e.getMessage());
            return Map.of();
        }
    }

    @Transactional(readOnly = true)
    public BigDecimal costOfGoodsSold(LocalDate dateFrom, LocalDate dateTo, UUID warehouseId) {
        UUID tenantId = TenantContext.require();
        return saleRepo.costOfGoodsSold(tenantId, dateFrom, dateTo, warehouseId);
    }

    // ---------- WAC backfill ----------

    /**
     * Backfill weighted average cost on stock_levels for existing products.
     * Uses the most recent RECEIVED purchase cost per product.
     * Only updates rows where weighted_avg_cost is currently 0.
     * Run once per tenant — idempotent.
     */
    @Transactional
    public Map<String, Object> backfillWac() {
        UUID tenantId = TenantContext.require();
        List<Object[]> rows = purchaseRepo.findLatestCostsByTenant(tenantId);

        Set<String> seen = new HashSet<>();
        List<InventoryClient.WacUpdateItem> items = new ArrayList<>();

        for (Object[] row : rows) {
            UUID productId = (UUID) row[0];
            UUID variantId = (UUID) row[1];
            UUID warehouseId = (UUID) row[2];
            BigDecimal unitCost = (BigDecimal) row[3];
            String key = productId + "-" + (variantId != null ? variantId : "null") + "-" + warehouseId;
            if (seen.add(key)) {
                items.add(new InventoryClient.WacUpdateItem(productId, variantId, warehouseId, unitCost));
            }
        }

        if (items.isEmpty()) return Map.of("updated", 0, "message", "No purchase data to backfill for this tenant");

        var resp = inventory.backfillWac(new InventoryClient.WacUpdateRequest(items));
        return Map.of("updated", resp.get("updated"), "costsFound", items.size());
    }

    /**
     * Backfill unit_cost on historical CONFIRMED sale lines from the current
     * weighted_avg_cost in the Inventory Service.
     * Run once per tenant -- idempotent (skips lines with non-zero unitCost).
     */
    @Transactional
    public Map<String, Object> backfillSaleCosts() {
        UUID tenantId = TenantContext.require();
        List<Object[]> rows = saleRepo.findLinesNeedingCostBackfill(tenantId);

        if (rows.isEmpty()) return Map.of("updated", 0, "message", "All historical sales already have cost data");

        // Group by warehouseId and collect productIds
        Map<UUID, Set<UUID>> warehouseProducts = new LinkedHashMap<>();
        for (Object[] row : rows) {
            UUID warehouseId = (UUID) row[4];
            UUID productId = (UUID) row[2];
            warehouseProducts.computeIfAbsent(warehouseId, k -> new LinkedHashSet<>()).add(productId);
        }

        // Fetch WAC for each warehouse's products
        Map<String, BigDecimal> costCache = new HashMap<>();
        for (var entry : warehouseProducts.entrySet()) {
            try {
                var costs = inventory.getCosts(entry.getKey(), new ArrayList<>(entry.getValue()));
                for (var c : costs) {
                    String key = entry.getKey() + "-" + c.productId() + "-" + (c.variantId() != null ? c.variantId() : "null");
                    costCache.put(key, c.weightedAvgCost());
                }
            } catch (Exception e) {
                log.warn("Could not fetch costs for warehouse {}: {}", entry.getKey(), e.getMessage());
            }
        }

        int updated = 0;
        int skipped = 0;
        for (Object[] row : rows) {
            UUID saleId = (UUID) row[0];
            UUID lineId = (UUID) row[1];
            UUID productId = (UUID) row[2];
            UUID variantId = (UUID) row[3];
            UUID warehouseId = (UUID) row[4];
            String key = warehouseId + "-" + productId + "-" + (variantId != null ? variantId : "null");
            BigDecimal wac = costCache.get(key);

            if (wac != null && wac.signum() > 0) {
                Sale sale = saleRepo.findByIdWithLines(saleId).orElse(null);
                if (sale != null) {
                    for (var line : sale.getLines()) {
                        if (line.getId().equals(lineId)) {
                            line.setUnitCost(wac);
                            updated++;
                            break;
                        }
                    }
                }
            } else {
                skipped++;
            }
        }

        return Map.of("updated", updated, "skipped", skipped, "total", rows.size());
    }

    // ---------- Create & confirm (back-office) ----------

    /**
     * Create + reserve stock. Split across three lightweight transactions so
     * Feign calls never hold a DB connection open.
     *
     * Phase 1: Persist Sale in DRAFT (short DB tx).
     * Phase 2: Reserve stock via Inventory Service (Feign, no DB tx).
     * Phase 3: On success → confirm + emit SaleConfirmed (short DB tx).
     *          On failure → cancel draft (compensating tx).
     *
     * The inventory reservation is idempotent by saleId and expires after TTL,
     * so a retry of this entire flow is safe.
     */
    public SaleDto create(CreateSaleRequest req, UUID userId, boolean isPosFastPath) {
        Sale sale = buildSale(req, userId);

        // Phase 1: Persist DRAFT (transactional)
        Sale saved = txTemplate.execute(status -> saleRepo.save(sale));
        if (saved == null) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR,
                    "Failed to persist sale draft");
        }

        // Phase 2: Reserve stock (Feign — no DB tx held)
        List<InventoryClient.ReservationLine> reservationLines = saved.getLines().stream()
                .map(l -> new InventoryClient.ReservationLine(
                        l.getProductId(), l.getVariantId(), saved.getWarehouseId(), l.getQty()))
                .toList();
        try {
            inventory.reserve(new InventoryClient.ReserveRequest(
                    saved.getId(), reservationLines, reservationTtlMinutes));
        } catch (FeignException e) {
            String detail = extractProblemDetail(e);
            log.warn("Stock reservation failed for sale {}: {}", saved.getId(), detail);
            // Compensate: cancel the DRAFT sale
            txTemplate.executeWithoutResult(st -> {
                Sale draft = saleRepo.findById(saved.getId()).orElse(null);
                if (draft != null) draft.cancel();
            });
            throw new ResponseStatusException(HttpStatus.CONFLICT, detail);
        } catch (Exception e) {
            log.warn("Stock reservation failed for sale {}: {}", saved.getId(), e.getMessage());
            txTemplate.executeWithoutResult(st -> {
                Sale draft = saleRepo.findById(saved.getId()).orElse(null);
                if (draft != null) draft.cancel();
            });
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "Could not reserve stock: " + e.getMessage());
        }

        // Phase 3: Confirm + emit events (transactional)
        return txTemplate.execute(status -> {
            Sale confirmed = saleRepo.findByIdWithLines(saved.getId()).orElseThrow();
            confirmed.confirm();
            outbox.publish("Sale", confirmed.getId(), "SaleConfirmed", saleEventPayload(confirmed));

            if (isPosFastPath) {
                try {
                    inventory.commit(confirmed.getId());
                    confirmed.setPaidTotal(confirmed.getGrandTotal());
                    confirmed.recomputePaymentStatus();
                    outbox.publish("Sale", confirmed.getId(), "SaleCompleted",
                            Map.of("saleId", confirmed.getId(), "ref", confirmed.getRef()));
                } catch (Exception e) {
                    log.error("POS commit failed for sale {} — will need manual reconciliation",
                            confirmed.getId(), e);
                    throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR,
                            "Stock commit failed: " + e.getMessage());
                }
            }
            return SaleDto.from(confirmed);
        });
    }

    /** Build a DRAFT Sale entity from the request (no side effects). */
    private Sale buildSale(CreateSaleRequest req, UUID userId) {
        TaxMethod headerTaxMethod = req.taxMethod() == null ? TaxMethod.EXCLUSIVE : req.taxMethod();
        Sale sale = Sale.builder()
                .ref(nextRef())
                .date(req.date() != null ? req.date() : LocalDate.now())
                .customerId(req.customerId())
                .warehouseId(req.warehouseId())
                .userId(userId)
                .pos(Boolean.TRUE.equals(req.isPos()) || userId != null)
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
                    .productNameSnapshot(productNameResolver.resolve(in.productId(), in.productName()))
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

        // Snapshot WAC from Inventory (read-only Feign call — no DB tx held)
        List<UUID> productIds = sale.getLines().stream()
                .map(SaleLine::getProductId).distinct().toList();
        if (!productIds.isEmpty()) {
            try {
                var costs = inventory.getCosts(sale.getWarehouseId(), productIds);
                var costMap = costs.stream().collect(Collectors.toMap(
                        c -> new AbstractMap.SimpleEntry<>(c.productId(), c.variantId()),
                        c -> c.weightedAvgCost(), (a, b) -> a));
                for (SaleLine line : sale.getLines()) {
                    BigDecimal wac = costMap.get(
                            new AbstractMap.SimpleEntry<>(line.getProductId(), line.getVariantId()));
                    if (wac != null && wac.signum() > 0) {
                        line.setUnitCost(wac);
                    } else {
                        try {
                            var product = productClient.getProduct(line.getProductId());
                            if (product.cost() != null && product.cost().signum() > 0) {
                                line.setUnitCost(product.cost());
                            }
                        } catch (Exception ignored) { /* leave unitCost as default */ }
                    }
                }
            } catch (Exception e) {
                log.warn("Could not fetch WAC for sale {}: {}", sale.getId(), e.getMessage());
            }
        }

        PricingEngine.DocCalc doc = pricing.calcDocument(
                sumSubtotal, sumTax, req.discount(), req.shipping());
        sale.setSubtotal(doc.subtotal());
        sale.setTaxTotal(doc.taxTotal());
        sale.setDiscountTotal(doc.discountTotal());
        sale.setShipping(doc.shipping());
        sale.setGrandTotal(doc.grandTotal());
        return sale;
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
        // Timestamp-based unique ref — zero DB queries, collision-resistant
        // Format: INV-2026-584729-a3f2
        long ts = System.currentTimeMillis() % 1_000_000;
        String suffix = UUID.randomUUID().toString().substring(0, 4);
        return "INV-" + Year.now().getValue() + "-" + ts + "-" + suffix;
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

    private boolean isSuperAdmin() {
        var auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null) return false;
        return auth.getAuthorities().stream()
            .anyMatch(a -> a.getAuthority().equals("ROLE_SUPER_ADMIN"));
    }

    /**
     * Extract the RFC 7807 Problem Detail {@code detail} field from a Feign
     * error response body and rewrite inventory-service messages into
     * cashier-friendly text.
     */
    private static String extractProblemDetail(FeignException e) {
        try {
            String body = e.contentUTF8();
            if (body != null && !body.isBlank()) {
                JsonNode node = objectMapper.readTree(body);
                if (node.has("detail")) {
                    String detail = node.get("detail").asText();
                    return rewriteInventoryMessage(detail);
                }
            }
        } catch (Exception ignored) {
            // Response body wasn't JSON — use the status reason
        }
        return "Stock reservation failed (HTTP " + e.status() + ")";
    }

    /** Rewrite inventory-service error detail into cashier-friendly text. */
    private static String rewriteInventoryMessage(String detail) {
        if (detail == null) return "Not enough stock to complete this sale.";
        // "Insufficient stock: requested=22 available=3.0000"
        var m = java.util.regex.Pattern
                .compile("Insufficient stock:\\s*requested=([0-9.]+)\\s+available=([0-9.]+)")
                .matcher(detail);
        if (m.find()) {
            int requested = new java.math.BigDecimal(m.group(1)).intValue();
            int available = new java.math.BigDecimal(m.group(2)).intValue();
            return String.format(
                    "Not enough stock — you need %d but only %d %s available.",
                    requested, available, available == 1 ? "is" : "are");
        }
        return detail;
    }

    /**
     * Lightweight projection for AR aging — only the fields Payment Service needs.
     */
    public record OutstandingSale(UUID id, String ref, LocalDate date, LocalDate dueDate,
                                   String paymentStatus, BigDecimal grandTotal, BigDecimal paidTotal) {}

    public List<OutstandingSale> outstanding() {
        UUID tenantId = TenantContext.require();
        List<Sale> sales = saleRepo.findOutstandingByTenant(tenantId);
        return sales.stream()
                .map(s -> new OutstandingSale(
                        s.getId(), s.getRef(), s.getDate(), s.getDueDate(),
                        s.getPaymentStatus().name(), s.getGrandTotal(), s.getPaidTotal()))
                .toList();
    }
}
