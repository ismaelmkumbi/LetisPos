package io.smartpos.payment.application;

import io.smartpos.common.context.TenantContext;
import jakarta.persistence.EntityManager;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class PaymentStatsService {

    private final EntityManager em;

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
    public List<AgingBucket> aging(LocalDate asOf) {
        LocalDate end = asOf != null ? asOf : LocalDate.now();
        // TODO: Query outstanding purchase payments grouped by age.
        // Real AR tracking requires joining with the sales-service purchase
        // data (grand_total - paid_total per purchase) to know outstanding
        // amounts. Until that cross-service aggregation is available, return
        // properly-shaped empty buckets so the frontend can render the table.
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
