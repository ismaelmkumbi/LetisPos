package io.smartpos.inventory.application;

import io.smartpos.inventory.application.dto.ReorderSuggestion;
import io.smartpos.inventory.domain.model.MovementType;
import io.smartpos.inventory.domain.model.ReorderRule;
import io.smartpos.inventory.domain.model.StockLevel;
import io.smartpos.inventory.domain.repository.ReorderRuleRepository;
import io.smartpos.inventory.domain.repository.StockLevelRepository;
import io.smartpos.inventory.domain.repository.StockMovementRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.stream.Collectors;

/**
 * Computes reorder suggestions based on sales velocity (from stock movements)
 * and existing reorder rules. Falls back to reorder rules alone when no sales
 * data is available.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class ReorderSuggestionService {

    private static final int VELOCITY_WINDOW_DAYS = 30;
    private static final int DEFAULT_LEAD_TIME_DAYS = 7;

    private final StockLevelRepository stockRepo;
    private final ReorderRuleRepository ruleRepo;
    private final StockMovementRepository movementRepo;

    /**
     * Generate reorder suggestions for a tenant.
     * Algorithm: daily_velocity (last 30 days) x lead_time_days + safety_stock
     * Falls back to reorder_rules if no sales data.
     */
    public List<ReorderSuggestion> generateSuggestions(UUID tenantId) {
        List<StockLevel> stocks = stockRepo.findByTenantId(tenantId);
        List<ReorderRule> rules = ruleRepo.findByTenantId(tenantId);
        Map<UUID, ReorderRule> ruleByProduct = rules.stream()
            .collect(Collectors.toMap(ReorderRule::getProductId, r -> r, (a, b) -> a));

        return stocks.stream()
            .filter(s -> {
                ReorderRule r = ruleByProduct.get(s.getProductId());
                return r != null && r.isActive()
                    && s.getOnHand().compareTo(r.getMinQty()) <= 0;
            })
            .map(s -> {
                ReorderRule r = ruleByProduct.get(s.getProductId());
                double dailyVelocity = calculateDailyVelocity(s.getProductId(),
                    s.getWarehouseId(), tenantId);
                int onHand = s.getOnHand().intValue();
                int minQty = r.getMinQty().intValue();
                int reorderQty = r.getReorderQty().intValue();

                int suggestedQty = (int) Math.ceil(dailyVelocity * DEFAULT_LEAD_TIME_DAYS + minQty);
                suggestedQty = Math.max(suggestedQty, reorderQty);

                String urgency;
                if (onHand <= minQty / 3.0) {
                    urgency = "HIGH";
                } else if (onHand <= minQty / 2.0) {
                    urgency = "MEDIUM";
                } else {
                    urgency = "LOW";
                }

                return ReorderSuggestion.builder()
                    .productId(s.getProductId())
                    .productName(null) // resolved by frontend via product service
                    .currentStock(onHand)
                    .suggestedQty(suggestedQty)
                    .minQty(minQty)
                    .supplierId(r.getSupplierId())
                    .urgency(urgency)
                    .dailyVelocity(dailyVelocity)
                    .expectedShortageDate(calculateShortageDate(onHand, dailyVelocity))
                    .tenantId(tenantId)
                    .build();
            })
            .sorted(Comparator.comparing(ReorderSuggestion::getUrgency).reversed()
                .thenComparing(Comparator.comparing(ReorderSuggestion::getDailyVelocity).reversed()))
            .collect(Collectors.toList());
    }

    /**
     * Compute average daily sales velocity from SALE_OUT movements over the
     * last 30 days. Returns a reasonable fallback (1.0) when no data exists.
     */
    private double calculateDailyVelocity(UUID productId, UUID warehouseId, UUID tenantId) {
        try {
            Instant since = Instant.now().minus(VELOCITY_WINDOW_DAYS, ChronoUnit.DAYS);
            BigDecimal totalOut = movementRepo.findByProductIdAndMovementTypeSince(
                    productId, MovementType.SALE_OUT, since, tenantId)
                .stream()
                .map(m -> m.getQtyDelta().abs())
                .reduce(BigDecimal.ZERO, BigDecimal::add);
            return totalOut.divide(BigDecimal.valueOf(VELOCITY_WINDOW_DAYS), 2, RoundingMode.HALF_UP)
                .doubleValue();
        } catch (Exception e) {
            log.debug("Could not compute velocity for product {}: {}", productId, e.getMessage());
            return 1.0;
        }
    }

    /**
     * Estimate the date when stock runs out at current velocity.
     * Returns null if velocity is zero or negative.
     */
    private LocalDate calculateShortageDate(int currentStock, double dailyVelocity) {
        if (dailyVelocity <= 0) return null;
        int daysUntilZero = (int) (currentStock / dailyVelocity);
        return LocalDate.now().plusDays(daysUntilZero);
    }
}
