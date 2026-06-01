package io.smartpos.payment.application;

import io.smartpos.common.context.TenantContext;
import io.smartpos.payment.infrastructure.feign.SalesClient;
import jakarta.persistence.EntityManager;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class PaymentStatsService {

    private final EntityManager em;
    private final SalesClient salesClient;

    public record PaymentStats(
            long count,
            BigDecimal totalIn,
            BigDecimal totalOut
    ) {}

    @Transactional(readOnly = true)
    public PaymentStats stats(LocalDate from, LocalDate to, UUID accountId) {
        // In = SALE + PURCHASE_RETURN + DEPOSIT   (money arriving)
        // Out = PURCHASE + SALE_RETURN + EXPENSE  (money leaving)
        StringBuilder jpql = new StringBuilder("""
            SELECT COUNT(p),
                   COALESCE(SUM(CASE WHEN p.referenceType IN ('SALE','PURCHASE_RETURN','DEPOSIT') THEN p.amount ELSE 0 END), 0),
                   COALESCE(SUM(CASE WHEN p.referenceType IN ('PURCHASE','SALE_RETURN','EXPENSE') THEN p.amount ELSE 0 END), 0)
            FROM Payment p
            WHERE p.status = 'COMPLETED'
              AND p.tenantId = :tenantId
            """);
        if (from != null) jpql.append(" AND p.date >= :dateFrom ");
        if (to != null) jpql.append(" AND p.date <= :dateTo ");
        if (accountId != null) jpql.append(" AND p.accountId = :accountId ");

        var query = em.createQuery(jpql.toString());
        query.setParameter("tenantId", TenantContext.require());
        if (from != null) query.setParameter("dateFrom", from);
        if (to != null) query.setParameter("dateTo", to);
        if (accountId != null) query.setParameter("accountId", accountId);

        Object[] row = (Object[]) query.getSingleResult();
        return new PaymentStats(((Number) row[0]).longValue(),
                (BigDecimal) row[1], (BigDecimal) row[2]);
    }

    public record ExpenseStats(BigDecimal total, long count) {}

    public record DebtSummary(BigDecimal totalAR, int arCount, BigDecimal totalAP, int apCount) {}

    @Transactional(readOnly = true)
    public DebtSummary debtSummary() {
        BigDecimal totalAR = BigDecimal.ZERO;
        int arCount = 0;
        BigDecimal totalAP = BigDecimal.ZERO;
        int apCount = 0;
        try {
            var ar = salesClient.outstandingSales();
            if (ar != null) {
                for (var s : ar) {
                    totalAR = totalAR.add(s.grandTotal().subtract(s.paidTotal()));
                    arCount++;
                }
            }
        } catch (Exception e) {
            log.warn("Debt summary AR fetch failed: {}", e.getMessage());
        }
        try {
            var ap = salesClient.outstandingPurchases();
            if (ap != null) {
                for (var p : ap) {
                    totalAP = totalAP.add(p.grandTotal().subtract(p.paidTotal()));
                    apCount++;
                }
            }
        } catch (Exception e) {
            log.warn("Debt summary AP fetch failed: {}", e.getMessage());
        }
        return new DebtSummary(totalAR, arCount, totalAP, apCount);
    }

    @Transactional(readOnly = true)
    public ExpenseStats expenseStats(LocalDate from, LocalDate to) {
        StringBuilder jpql = new StringBuilder("""
            SELECT COALESCE(SUM(e.amount), 0), COUNT(e)
            FROM Expense e
            WHERE e.tenantId = :tenantId
            """);
        if (from != null) jpql.append(" AND e.date >= :dateFrom ");
        if (to != null) jpql.append(" AND e.date <= :dateTo ");

        var query = em.createQuery(jpql.toString());
        query.setParameter("tenantId", TenantContext.require());
        if (from != null) query.setParameter("dateFrom", from);
        if (to != null) query.setParameter("dateTo", to);

        Object[] row = (Object[]) query.getSingleResult();
        return new ExpenseStats((BigDecimal) row[0], ((Number) row[1]).longValue());
    }

    public record ByMethodRow(String method, BigDecimal total, long count) {}

    public record AgingBucket(String label, int daysFrom, int daysTo,
                              BigDecimal amount, int invoiceCount) {}

    @Transactional(readOnly = true)
    public List<AgingBucket> arAging(LocalDate asOf) {
        LocalDate today = asOf != null ? asOf : LocalDate.now();
        try {
            List<SalesClient.OutstandingSale> sales = salesClient.outstandingSales();
            if (sales.isEmpty()) {
                return emptyBuckets();
            }
            return computeBuckets(sales.stream()
                    .map(s -> new AgingRow(s.date(), s.dueDate(),
                            s.grandTotal().subtract(s.paidTotal())))
                    .toList(), today);
        } catch (Exception e) {
            log.warn("AR aging query failed, returning empty buckets: {}", e.getMessage());
            return emptyBuckets();
        }
    }

    @Transactional(readOnly = true)
    public List<AgingBucket> apAging(LocalDate asOf) {
        LocalDate today = asOf != null ? asOf : LocalDate.now();
        try {
            List<SalesClient.OutstandingPurchase> purchases = salesClient.outstandingPurchases();
            if (purchases.isEmpty()) {
                return emptyBuckets();
            }
            return computeBuckets(purchases.stream()
                    .map(p -> new AgingRow(p.date(), p.dueDate(),
                            p.grandTotal().subtract(p.paidTotal())))
                    .toList(), today);
        } catch (Exception e) {
            log.warn("AP aging query failed, returning empty buckets: {}", e.getMessage());
            return emptyBuckets();
        }
    }

    /** Keep legacy method for backward compatibility — delegates to AR aging. */
    @Transactional(readOnly = true)
    public List<AgingBucket> aging(LocalDate asOf) {
        return arAging(asOf);
    }

    private record AgingRow(LocalDate date, LocalDate dueDate, BigDecimal due) {}

    private List<AgingBucket> computeBuckets(List<AgingRow> rows, LocalDate today) {
        BigDecimal[] buckets = { BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO };
        int[] counts = new int[4];
        for (AgingRow r : rows) {
            if (r.due().compareTo(BigDecimal.ZERO) <= 0) continue;
            LocalDate refDate = r.dueDate() != null ? r.dueDate() : r.date();
            long days = ChronoUnit.DAYS.between(refDate, today);
            int bucket;
            if (days <= 30)        bucket = 0;
            else if (days <= 60)   bucket = 1;
            else if (days <= 90)   bucket = 2;
            else                   bucket = 3;
            buckets[bucket] = buckets[bucket].add(r.due());
            counts[bucket]++;
        }
        return List.of(
            new AgingBucket("0-30 days", 0, 30, buckets[0], counts[0]),
            new AgingBucket("31-60 days", 31, 60, buckets[1], counts[1]),
            new AgingBucket("61-90 days", 61, 90, buckets[2], counts[2]),
            new AgingBucket("90+ days", 91, Integer.MAX_VALUE, buckets[3], counts[3])
        );
    }

    private List<AgingBucket> emptyBuckets() {
        return List.of(
            new AgingBucket("0-30 days", 0, 30, BigDecimal.ZERO, 0),
            new AgingBucket("31-60 days", 31, 60, BigDecimal.ZERO, 0),
            new AgingBucket("61-90 days", 61, 90, BigDecimal.ZERO, 0),
            new AgingBucket("90+ days", 91, Integer.MAX_VALUE, BigDecimal.ZERO, 0)
        );
    }

    @Transactional(readOnly = true)
    public List<ByMethodRow> paymentsByMethod(LocalDate from, LocalDate to) {
        StringBuilder jpql = new StringBuilder("""
            SELECT p.method,
                   COALESCE(SUM(p.amount), 0),
                   COUNT(p)
            FROM Payment p
            WHERE p.status = 'COMPLETED'
              AND p.tenantId = :tenantId
            """);
        if (from != null) jpql.append(" AND p.date >= :dateFrom");
        if (to != null) jpql.append(" AND p.date <= :dateTo");
        jpql.append(" GROUP BY p.method ORDER BY SUM(p.amount) DESC");

        var query = em.createQuery(jpql.toString());
        query.setParameter("tenantId", TenantContext.require());
        if (from != null) query.setParameter("dateFrom", from);
        if (to != null) query.setParameter("dateTo", to);

        @SuppressWarnings("unchecked")
        List<Object[]> rows = query.getResultList();
        List<ByMethodRow> out = new ArrayList<>(rows.size());
        for (Object[] r : rows) {
            out.add(new ByMethodRow(r[0].toString(), (BigDecimal) r[1], ((Number) r[2]).longValue()));
        }
        return out;
    }
}
