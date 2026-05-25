package io.smartpos.inventory.application;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.smartpos.common.context.TenantContext;
import io.smartpos.inventory.api.dto.ReservationDto;
import io.smartpos.inventory.api.dto.StockLevelDto;
import io.smartpos.inventory.api.dto.WacUpdateRequest;
import io.smartpos.inventory.domain.model.*;
import io.smartpos.inventory.domain.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.dao.OptimisticLockingFailureException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.time.Duration;
import java.time.Instant;
import java.util.*;

/**
 * Core stock operations. Serialises concurrent writes to the same
 * {@link StockLevel} row with pessimistic row locks (Postgres SELECT ... FOR
 * UPDATE), not just optimistic versions — because the POS hot path can have
 * many registers hitting the same SKU at once and we want deterministic
 * ordering rather than retry storms.
 *
 * All public methods are @Transactional so each call is a single Postgres tx:
 * stock_levels update + stock_movements insert + outbox insert atomic.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class StockService {

    private final StockLevelRepository       stockRepo;
    private final StockMovementRepository    movementRepo;
    private final StockReservationRepository reservationRepo;
    private final OutboxPublisher            outbox;
    private final ObjectMapper               objectMapper;

    @Value("${smartpos.inventory.reservation.ttl-minutes:10}")
    private int defaultTtlMinutes;

    // ---- Simple queries ----

    @Transactional(readOnly = true)
    public StockLevelDto find(UUID productId, UUID variantId, UUID warehouseId) {
        return stockRepo.find(productId, variantId, warehouseId, TenantContext.get().orElse(null))
                .map(StockLevelDto::from)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "No stock row"));
    }

    @Transactional(readOnly = true)
    public Page<StockLevelDto> listByWarehouse(UUID warehouseId, Pageable p) {
        return stockRepo.findByWarehouseId(warehouseId, p).map(StockLevelDto::from);
    }

    @Transactional(readOnly = true)
    public Page<StockLevelDto> lowStock(UUID warehouseId, Pageable p) {
        return stockRepo.findLowStock(warehouseId, TenantContext.get().orElse(null), p).map(StockLevelDto::from);
    }

    @Transactional(readOnly = true)
    public Map<UUID, StockLevelDto> batchLevels(UUID warehouseId, List<UUID> productIds) {
        List<StockLevel> levels = stockRepo.findByWarehouseAndProducts(warehouseId, productIds, TenantContext.get().orElse(null));
        Map<UUID, StockLevelDto> result = new LinkedHashMap<>();
        for (StockLevel s : levels) {
            result.put(s.getProductId(), StockLevelDto.from(s));
        }
        return result;
    }

    /**
     * Aggregate available / on-hand / reserved across every active warehouse
     * for each product. One Postgres round-trip instead of N×W HTTP calls.
     * Products with no stock row return zeros so the caller can render
     * "0" instead of "unknown".
     */
    @Transactional(readOnly = true)
    public Map<UUID, Map<String, Object>> batchAggregate(List<UUID> productIds) {
        UUID tenantId = TenantContext.get().orElse(null);
        if (productIds == null || productIds.isEmpty()) return Map.of();
        List<StockLevel> levels = stockRepo.findByProductsAcrossWarehouses(productIds, tenantId);

        Map<UUID, BigDecimal[]> agg = new LinkedHashMap<>();
        Map<UUID, BigDecimal[]> costAgg = new LinkedHashMap<>(); // [totalCostValue, totalQty]
        Map<UUID, Integer> warehouseCounts = new LinkedHashMap<>();
        for (StockLevel s : levels) {
            // [available, onHand, reserved]
            BigDecimal[] sums = agg.computeIfAbsent(s.getProductId(),
                k -> new BigDecimal[]{BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO});
            BigDecimal onHand = s.getOnHand() != null ? s.getOnHand() : BigDecimal.ZERO;
            BigDecimal reserved = s.getReserved() != null ? s.getReserved() : BigDecimal.ZERO;
            sums[0] = sums[0].add(onHand.subtract(reserved));
            sums[1] = sums[1].add(onHand);
            sums[2] = sums[2].add(reserved);
            warehouseCounts.merge(s.getProductId(), 1, Integer::sum);

            // Weighted average cost: sum(cost * qty) / sum(qty) across warehouses
            BigDecimal[] cArr = costAgg.computeIfAbsent(s.getProductId(),
                k -> new BigDecimal[]{BigDecimal.ZERO, BigDecimal.ZERO});
            BigDecimal wac = s.getWeightedAvgCost() != null ? s.getWeightedAvgCost() : BigDecimal.ZERO;
            if (onHand.compareTo(BigDecimal.ZERO) > 0 && wac.compareTo(BigDecimal.ZERO) > 0) {
                cArr[0] = cArr[0].add(wac.multiply(onHand)); // total cost value
                cArr[1] = cArr[1].add(onHand);               // total quantity for weighting
            }
        }

        Map<UUID, Map<String, Object>> out = new LinkedHashMap<>();
        for (UUID pid : productIds) {
            BigDecimal[] sums = agg.getOrDefault(pid,
                new BigDecimal[]{BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO});
            BigDecimal[] cArr = costAgg.getOrDefault(pid,
                new BigDecimal[]{BigDecimal.ZERO, BigDecimal.ZERO});
            // Weighted average cost = totalCostValue / totalQty
            BigDecimal wac = cArr[1].compareTo(BigDecimal.ZERO) > 0
                ? cArr[0].divide(cArr[1], 4, java.math.RoundingMode.HALF_UP) : BigDecimal.ZERO;
            Map<String, Object> row = new LinkedHashMap<>();
            row.put("available", sums[0]);
            row.put("onHand", sums[1]);
            row.put("reserved", sums[2]);
            row.put("warehouses", warehouseCounts.getOrDefault(pid, 0));
            row.put("weightedAvgCost", wac);
            out.put(pid, row);
        }
        return out;
    }

    // ---- Reservations: reserve / commit / release ----

    /**
     * Reserve stock for a sale. Idempotent by saleId — repeated calls return
     * the existing ACTIVE reservation (the saga can safely retry on flaky nets).
     *
     * Pessimistic row-lock per line. If any line is short, the whole batch fails
     * with 409 CONFLICT and no partial state is persisted (all-or-nothing tx).
     */
    @Transactional
    public ReservationDto.Response reserve(ReservationDto.CreateRequest req, UUID userId) {
        Optional<StockReservation> existing = reservationRepo.findBySaleId(req.saleId());
        if (existing.isPresent() && existing.get().isActive()) {
            return toResponse(existing.get());
        }

        int ttl = req.ttlMinutes() != null ? req.ttlMinutes() : defaultTtlMinutes;

        // Lock all involved rows in a deterministic order to avoid deadlocks.
        List<ReservationDto.Line> sorted = new ArrayList<>(req.lines());
        sorted.sort(Comparator
                .comparing((ReservationDto.Line l) -> l.productId().toString())
                .thenComparing(l -> l.warehouseId().toString())
                .thenComparing(l -> l.variantId() == null ? "" : l.variantId().toString()));

        UUID tenantId = TenantContext.get().orElse(null);
        for (ReservationDto.Line line : sorted) {
            StockLevel s = stockRepo.findForUpdate(line.productId(), line.variantId(), line.warehouseId(), tenantId)
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.CONFLICT,
                            "No stock row for product=" + line.productId() + " warehouse=" + line.warehouseId()));
            try {
                s.reserve(line.qty());
            } catch (IllegalStateException e) {
                throw new ResponseStatusException(HttpStatus.CONFLICT, e.getMessage());
            }
            stockRepo.save(s);
        }

        StockReservation res = StockReservation.builder()
                .saleId(req.saleId())
                .linesJson(toJson(sorted.stream()
                        .map(l -> new ReservationLine(l.productId(), l.variantId(), l.warehouseId(), l.qty()))
                        .toList()))
                .expiresAt(Instant.now().plus(Duration.ofMinutes(ttl)))
                .status(ReservationStatus.ACTIVE)
                .userId(userId)
                .tenantId(tenantId)
                .build();
        res = reservationRepo.save(res);

        outbox.publish("StockReservation", res.getId(), "StockReserved", Map.of(
                "saleId", res.getSaleId(), "expiresAt", res.getExpiresAt().toString()));

        return toResponse(res);
    }

    /**
     * Commit a reservation — the sale is final. Moves {@code reserved → deducted}
     * and appends SALE_OUT movements.
     */
    @Transactional
    public void commit(UUID saleId, UUID userId) {
        StockReservation r = reservationRepo.findBySaleId(saleId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Reservation not found"));
        if (r.getStatus() == ReservationStatus.COMMITTED) return;            // idempotent
        if (r.getStatus() != ReservationStatus.ACTIVE) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "Reservation is " + r.getStatus() + ", cannot commit");
        }

        List<ReservationLine> lines = fromJson(r.getLinesJson());
        UUID tenantId = TenantContext.get().orElse(null);

        for (ReservationLine line : lines) {
            StockLevel s = stockRepo.findForUpdate(line.productId(), line.variantId(), line.warehouseId(), tenantId)
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.CONFLICT, "Stock row vanished"));
            try {
                s.commitReserved(line.qty());
            } catch (IllegalStateException e) {
                throw new ResponseStatusException(HttpStatus.CONFLICT, e.getMessage());
            }
            stockRepo.save(s);

            movementRepo.save(StockMovement.builder()
                    .productId(line.productId()).variantId(line.variantId())
                    .warehouseId(line.warehouseId())
                    .movementType(MovementType.SALE_OUT)
                    .qtyDelta(line.qty().negate())
                    .referenceType(ReferenceType.SALE)
                    .referenceId(saleId)
                    .userId(userId)
                    .tenantId(tenantId)
                    .build());
        }

        r.setStatus(ReservationStatus.COMMITTED);
        r.setCommittedAt(Instant.now());
        reservationRepo.save(r);

        outbox.publish("StockReservation", r.getId(), "StockDeducted",
                Map.of("saleId", saleId, "lineCount", lines.size()));
    }

    /** Release a reservation (sale cancelled). Safe to call on already-released. */
    @Transactional
    public void release(UUID saleId) {
        StockReservation r = reservationRepo.findBySaleId(saleId).orElse(null);
        if (r == null || r.getStatus() != ReservationStatus.ACTIVE) return;

        UUID tenantId = TenantContext.get().orElse(null);
        List<ReservationLine> lines = fromJson(r.getLinesJson());
        for (ReservationLine line : lines) {
            StockLevel s = stockRepo.findForUpdate(line.productId(), line.variantId(), line.warehouseId(), tenantId)
                    .orElse(null);
            if (s == null) continue;
            s.releaseReservation(line.qty());
            stockRepo.save(s);
        }

        r.setStatus(ReservationStatus.RELEASED);
        r.setReleasedAt(Instant.now());
        reservationRepo.save(r);

        outbox.publish("StockReservation", r.getId(), "StockReleased", Map.of("saleId", saleId));
    }

    /** Called by the scheduled expiry job. Same as release but flags EXPIRED. */
    @Transactional
    public void expire(UUID reservationId) {
        StockReservation r = reservationRepo.findById(reservationId).orElse(null);
        if (r == null || r.getStatus() != ReservationStatus.ACTIVE) return;

        // Use the reservation's own tenantId because the scheduled job has no request context.
        UUID tenantId = r.getTenantId();
        List<ReservationLine> lines = fromJson(r.getLinesJson());
        for (ReservationLine line : lines) {
            stockRepo.findForUpdate(line.productId(), line.variantId(), line.warehouseId(), tenantId)
                    .ifPresent(s -> { s.releaseReservation(line.qty()); stockRepo.save(s); });
        }
        r.setStatus(ReservationStatus.EXPIRED);
        r.setReleasedAt(Instant.now());
        reservationRepo.save(r);

        outbox.publish("StockReservation", r.getId(), "StockReservationExpired",
                Map.of("saleId", r.getSaleId()));
    }

    // ---- Internal helper: ensure a stock_levels row exists; caller still locks it ----

    @Transactional
    public StockLevel upsert(UUID productId, UUID variantId, UUID warehouseId) {
        UUID tenantId = TenantContext.get().orElse(null);
        return stockRepo.findForUpdate(productId, variantId, warehouseId, tenantId).orElseGet(() -> {
            log.info("Creating new stock_levels row for product={} variant={} warehouse={}",
                    productId, variantId, warehouseId);
            StockLevel s = StockLevel.builder()
                    .productId(productId).variantId(variantId).warehouseId(warehouseId)
                    .onHand(BigDecimal.ZERO).reserved(BigDecimal.ZERO).stockAlertThreshold(0)
                    .tenantId(tenantId)
                    .build();
            return stockRepo.save(s);
        });
    }

    // ---- WAC backfill ----

    @Transactional
    public int backfillWac(WacUpdateRequest req) {
        int count = 0;
        for (var item : req.items()) {
            StockLevel s = upsert(item.productId(), item.variantId(), item.warehouseId());
            // Only update if current WAC is 0 (don't overwrite already-calculated WAC)
            if (s.getWeightedAvgCost().compareTo(BigDecimal.ZERO) == 0
                    && item.weightedAvgCost().compareTo(BigDecimal.ZERO) > 0) {
                s.setWeightedAvgCost(item.weightedAvgCost());
                stockRepo.save(s);
                count++;
            }
        }
        return count;
    }

    // ---- JSON helpers ----

    private String toJson(Object value) {
        try { return objectMapper.writeValueAsString(value); }
        catch (JsonProcessingException e) { throw new IllegalStateException(e); }
    }

    private List<ReservationLine> fromJson(String json) {
        try { return objectMapper.readValue(json, new TypeReference<List<ReservationLine>>() {}); }
        catch (JsonProcessingException e) { throw new IllegalStateException(e); }
    }

    private ReservationDto.Response toResponse(StockReservation r) {
        List<ReservationLine> lines = fromJson(r.getLinesJson());
        return new ReservationDto.Response(
                r.getId(),
                r.getSaleId(),
                lines.stream().map(l -> new ReservationDto.Line(
                        l.productId(), l.variantId(), l.warehouseId(), l.qty())).toList(),
                r.getExpiresAt(),
                r.getStatus().name()
        );
    }
}
