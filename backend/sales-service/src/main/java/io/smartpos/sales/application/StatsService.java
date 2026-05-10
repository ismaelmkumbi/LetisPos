package io.smartpos.sales.application;

import io.smartpos.sales.domain.model.PaymentStatus;
import io.smartpos.sales.domain.model.SaleStatus;
import io.smartpos.common.context.TenantContext;
import jakarta.persistence.EntityManager;
import jakarta.persistence.Tuple;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.*;

/**
 * Lightweight aggregation queries used by Report Service.
 * All queries scoped to CONFIRMED sales only (exclude draft/cancelled).
 */
@Service
@RequiredArgsConstructor
public class StatsService {

    private final EntityManager em;

    public record SaleStats(
            long count,
            BigDecimal gross,       // sum grand_total
            BigDecimal tax,
            BigDecimal discount,
            BigDecimal net,         // gross - discount (already includes tax absorption via pricing)
            BigDecimal paid,
            BigDecimal due
    ) {}

    @Transactional(readOnly = true)
    public SaleStats salesStats(LocalDate from, LocalDate to, UUID warehouseId, UUID customerId) {
        // CAST(:p AS UUID) is required for Postgres: when a UUID parameter is
        // null, Hibernate 6 sends it untyped, and PG can't infer the type from
        // `IS NULL OR ...` (both branches accept any type). Result is
        // "could not determine data type of parameter $N". Casting tells the
        // driver the type explicitly without changing IS-NULL semantics.
        String jpql = """
            SELECT COUNT(s),
                   COALESCE(SUM(s.grandTotal), 0),
                   COALESCE(SUM(s.taxTotal), 0),
                   COALESCE(SUM(s.discountTotal), 0),
                   COALESCE(SUM(s.paidTotal), 0)
            FROM Sale s
            WHERE s.status = :status
              AND s.tenantId = :tenantId
              AND (CAST(:dateFrom    AS java.time.LocalDate) IS NULL OR s.date >= :dateFrom)
              AND (CAST(:dateTo      AS java.time.LocalDate) IS NULL OR s.date <= :dateTo)
              AND (CAST(:warehouseId AS java.util.UUID)      IS NULL OR s.warehouseId = :warehouseId)
              AND (CAST(:customerId  AS java.util.UUID)      IS NULL OR s.customerId  = :customerId)
            """;
        Object[] row = (Object[]) em.createQuery(jpql)
                .setParameter("status", SaleStatus.CONFIRMED)
                .setParameter("tenantId", TenantContext.require())
                .setParameter("dateFrom", from)
                .setParameter("dateTo", to)
                .setParameter("warehouseId", warehouseId)
                .setParameter("customerId", customerId)
                .getSingleResult();
        long   count    = ((Number) row[0]).longValue();
        BigDecimal gross   = (BigDecimal) row[1];
        BigDecimal tax     = (BigDecimal) row[2];
        BigDecimal discount = (BigDecimal) row[3];
        BigDecimal paid    = (BigDecimal) row[4];
        BigDecimal net     = gross.subtract(discount);
        BigDecimal due     = gross.subtract(paid);
        return new SaleStats(count, gross, tax, discount, net, paid, due);
    }

    public record TopProduct(UUID productId, String productName, BigDecimal qty, BigDecimal revenue) {}

    @Transactional(readOnly = true)
    public List<TopProduct> topProducts(LocalDate from, LocalDate to, UUID warehouseId, int limit) {
        String jpql = """
            SELECT l.productId, l.productNameSnapshot,
                   COALESCE(SUM(l.qty), 0),
                   COALESCE(SUM(l.lineTotal), 0)
            FROM SaleLine l, Sale s
            WHERE s.id = l.saleId AND s.status = :status
              AND s.tenantId = :tenantId
              AND (CAST(:dateFrom    AS java.time.LocalDate) IS NULL OR s.date >= :dateFrom)
              AND (CAST(:dateTo      AS java.time.LocalDate) IS NULL OR s.date <= :dateTo)
              AND (CAST(:warehouseId AS java.util.UUID)      IS NULL OR s.warehouseId = :warehouseId)
            GROUP BY l.productId, l.productNameSnapshot
            ORDER BY SUM(l.lineTotal) DESC
            """;
        // Note: SaleLine has `sale_id` mapped via @JoinColumn on Sale.lines, so
        // we expose it as a read-only field. The cross-join above with a WHERE
        // equality is equivalent to an INNER JOIN.
        @SuppressWarnings("unchecked")
        List<Object[]> rows = em.createQuery(jpql)
                .setParameter("status", SaleStatus.CONFIRMED)
                .setParameter("tenantId", TenantContext.require())
                .setParameter("dateFrom", from)
                .setParameter("dateTo", to)
                .setParameter("warehouseId", warehouseId)
                .setMaxResults(Math.max(1, Math.min(limit, 100)))
                .getResultList();
        List<TopProduct> out = new ArrayList<>(rows.size());
        for (Object[] r : rows) {
            out.add(new TopProduct((UUID) r[0], (String) r[1], (BigDecimal) r[2], (BigDecimal) r[3]));
        }
        return out;
    }

    public record TopCustomer(UUID customerId, BigDecimal totalSpent, long orderCount) {}

    @Transactional(readOnly = true)
    public List<TopCustomer> topCustomers(LocalDate from, LocalDate to, int limit) {
        String jpql = """
            SELECT s.customerId,
                   COALESCE(SUM(s.grandTotal), 0),
                   COUNT(s)
            FROM Sale s
            WHERE s.status = :status AND s.customerId IS NOT NULL
              AND s.tenantId = :tenantId
              AND (CAST(:dateFrom AS java.time.LocalDate) IS NULL OR s.date >= :dateFrom)
              AND (CAST(:dateTo   AS java.time.LocalDate) IS NULL OR s.date <= :dateTo)
            GROUP BY s.customerId
            ORDER BY SUM(s.grandTotal) DESC
            """;
        @SuppressWarnings("unchecked")
        List<Object[]> rows = em.createQuery(jpql)
                .setParameter("status", SaleStatus.CONFIRMED)
                .setParameter("tenantId", TenantContext.require())
                .setParameter("dateFrom", from)
                .setParameter("dateTo", to)
                .setMaxResults(Math.max(1, Math.min(limit, 100)))
                .getResultList();
        List<TopCustomer> out = new ArrayList<>(rows.size());
        for (Object[] r : rows) {
            out.add(new TopCustomer((UUID) r[0], (BigDecimal) r[1], ((Number) r[2]).longValue()));
        }
        return out;
    }

    public record SalesSeriesPoint(LocalDate date, BigDecimal net, long count) {}

    @Transactional(readOnly = true)
    public List<SalesSeriesPoint> salesDailySeries(LocalDate from, LocalDate to, UUID warehouseId) {
        String jpql = """
            SELECT s.date,
                   COALESCE(SUM(s.grandTotal - s.discountTotal), 0),
                   COUNT(s)
            FROM Sale s
            WHERE s.status = :status
              AND s.tenantId = :tenantId
              AND (CAST(:dateFrom    AS java.time.LocalDate) IS NULL OR s.date >= :dateFrom)
              AND (CAST(:dateTo      AS java.time.LocalDate) IS NULL OR s.date <= :dateTo)
              AND (CAST(:warehouseId AS java.util.UUID)      IS NULL OR s.warehouseId = :warehouseId)
            GROUP BY s.date
            ORDER BY s.date
            """;
        @SuppressWarnings("unchecked")
        List<Object[]> rows = em.createQuery(jpql)
                .setParameter("status", SaleStatus.CONFIRMED)
                .setParameter("tenantId", TenantContext.require())
                .setParameter("dateFrom", from)
                .setParameter("dateTo", to)
                .setParameter("warehouseId", warehouseId)
                .getResultList();
        List<SalesSeriesPoint> out = new ArrayList<>(rows.size());
        for (Object[] r : rows) {
            out.add(new SalesSeriesPoint((LocalDate) r[0], (BigDecimal) r[1], ((Number) r[2]).longValue()));
        }
        return out;
    }

    // ---------- Purchase stats (mirror) ----------

    public record PurchaseStats(long count, BigDecimal gross, BigDecimal paid, BigDecimal due) {}

    @Transactional(readOnly = true)
    public PurchaseStats purchaseStats(LocalDate from, LocalDate to, UUID warehouseId) {
        String jpql = """
            SELECT COUNT(p),
                   COALESCE(SUM(p.grandTotal), 0),
                   COALESCE(SUM(p.paidTotal), 0)
            FROM Purchase p
            WHERE p.tenantId = :tenantId
              AND (CAST(:dateFrom    AS java.time.LocalDate) IS NULL OR p.date >= :dateFrom)
              AND (CAST(:dateTo      AS java.time.LocalDate) IS NULL OR p.date <= :dateTo)
              AND (CAST(:warehouseId AS java.util.UUID)      IS NULL OR p.warehouseId = :warehouseId)
            """;
        Object[] row = (Object[]) em.createQuery(jpql)
                .setParameter("tenantId", TenantContext.require())
                .setParameter("dateFrom", from)
                .setParameter("dateTo", to)
                .setParameter("warehouseId", warehouseId)
                .getSingleResult();
        long count = ((Number) row[0]).longValue();
        BigDecimal gross = (BigDecimal) row[1];
        BigDecimal paid  = (BigDecimal) row[2];
        return new PurchaseStats(count, gross, paid, gross.subtract(paid).max(BigDecimal.ZERO));
    }
}
