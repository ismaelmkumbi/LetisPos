package io.smartpos.report.application;

import io.smartpos.report.domain.model.ProcessedEvent;
import io.smartpos.report.domain.repository.ProcessedEventRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

/**
 * Applies event-derived increments to the Postgres fact cubes
 * ({@code fact_sales_daily}, {@code fact_payments_daily}) using
 * {@code INSERT ... ON CONFLICT ... DO UPDATE} so each event produces one
 * row or bumps the existing one.
 *
 * Idempotency is enforced at the event level — {@link #markProcessed}
 * inserts into {@code processed_events} with a unique PK, so a re-delivered
 * event hits a {@link DataIntegrityViolationException} before we double-count.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class FactProjectionService {

    private final JdbcTemplate             jdbc;
    private final ProcessedEventRepository processedRepo;

    /** Returns true if the caller should proceed (first time we've seen this event). */
    @Transactional
    public boolean markProcessed(UUID eventId, String eventType, String aggregateType) {
        try {
            processedRepo.save(ProcessedEvent.builder()
                    .eventId(eventId)
                    .eventType(eventType)
                    .aggregateType(aggregateType)
                    .build());
            return true;
        } catch (DataIntegrityViolationException dup) {
            log.info("Skipping duplicate event {} ({})", eventId, eventType);
            return false;
        }
    }

    // ---------- Sales cube ----------

    private static final String UPSERT_SALES = """
        INSERT INTO fact_sales_daily
            (id, date, warehouse_id, user_id, customer_id, tenant_id,
             sales_count, gross, tax, discount, net, updated_at)
        VALUES (uuid_generate_v4(), ?, ?, ?, ?, ?, 1, ?, ?, ?, ?, now())
        ON CONFLICT (date,
                     COALESCE(warehouse_id, '00000000-0000-0000-0000-000000000000'),
                     COALESCE(user_id,      '00000000-0000-0000-0000-000000000000'),
                     COALESCE(customer_id,  '00000000-0000-0000-0000-000000000000'),
                     COALESCE(tenant_id,    '00000000-0000-0000-0000-000000000000'))
        DO UPDATE SET
            sales_count = fact_sales_daily.sales_count + 1,
            gross       = fact_sales_daily.gross       + EXCLUDED.gross,
            tax         = fact_sales_daily.tax         + EXCLUDED.tax,
            discount    = fact_sales_daily.discount    + EXCLUDED.discount,
            net         = fact_sales_daily.net         + EXCLUDED.net,
            updated_at  = now()
        """;

    @Transactional
    public void applySaleConfirmed(LocalDate date, UUID warehouseId, UUID userId,
                                   UUID customerId, UUID tenantId,
                                   BigDecimal gross, BigDecimal tax,
                                   BigDecimal discount, BigDecimal net) {
        jdbc.update(UPSERT_SALES,
                date, warehouseId, userId, customerId, tenantId,
                nz(gross), nz(tax), nz(discount), nz(net));
    }

    // ---------- Payments cube ----------

    private static final String UPSERT_PAYMENTS = """
        INSERT INTO fact_payments_daily
            (id, date, account_id, method, tenant_id,
             amount_in, amount_out, txn_count)
        VALUES (uuid_generate_v4(), ?, ?, ?, ?, ?, ?, 1)
        ON CONFLICT (date, account_id, method,
                     COALESCE(tenant_id, '00000000-0000-0000-0000-000000000000'))
        DO UPDATE SET
            amount_in  = fact_payments_daily.amount_in  + EXCLUDED.amount_in,
            amount_out = fact_payments_daily.amount_out + EXCLUDED.amount_out,
            txn_count  = fact_payments_daily.txn_count  + 1
        """;

    @Transactional
    public void applyPaymentReceived(LocalDate date, UUID accountId, String method,
                                     UUID tenantId, BigDecimal amountIn, BigDecimal amountOut) {
        jdbc.update(UPSERT_PAYMENTS,
                date, accountId, method, tenantId,
                nz(amountIn), nz(amountOut));
    }

    // ---------- Product sales cube (Phase 6c) ----------

    private static final String UPSERT_PRODUCT_SALES = """
        INSERT INTO fact_product_sales_daily
            (id, date, product_id, warehouse_id, tenant_id,
             qty, gross, tax, net, updated_at)
        VALUES (uuid_generate_v4(), ?, ?, ?, ?, ?, ?, ?, ?, now())
        ON CONFLICT (date, product_id,
                     COALESCE(warehouse_id, '00000000-0000-0000-0000-000000000000'),
                     COALESCE(tenant_id,    '00000000-0000-0000-0000-000000000000'))
        DO UPDATE SET
            qty   = fact_product_sales_daily.qty   + EXCLUDED.qty,
            gross = fact_product_sales_daily.gross + EXCLUDED.gross,
            tax   = fact_product_sales_daily.tax   + EXCLUDED.tax,
            net   = fact_product_sales_daily.net   + EXCLUDED.net,
            updated_at = now()
        """;

    /**
     * Bumps a single product's daily roll-up. Skipped silently if
     * {@code productId} is null — the parent SaleConfirmed event is still
     * applied to the doc-level cube.
     */
    @Transactional
    public void applySaleLine(LocalDate date, UUID productId, UUID warehouseId, UUID tenantId,
                              BigDecimal qty, BigDecimal gross, BigDecimal tax, BigDecimal net) {
        if (productId == null) return;
        jdbc.update(UPSERT_PRODUCT_SALES,
                date, productId, warehouseId, tenantId,
                nz(qty), nz(gross), nz(tax), nz(net));
    }

    // ---------- Inventory snapshot (Phase 6c — nightly job) ----------

    private static final String UPSERT_INVENTORY = """
        INSERT INTO fact_inventory_snapshot
            (id, snapshot_date, product_id, warehouse_id, tenant_id,
             on_hand, unit_cost, valuation)
        VALUES (uuid_generate_v4(), ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT (snapshot_date, product_id, warehouse_id)
        DO UPDATE SET
            on_hand   = EXCLUDED.on_hand,
            unit_cost = EXCLUDED.unit_cost,
            valuation = EXCLUDED.valuation
        """;

    @Transactional
    public void applyInventorySnapshot(LocalDate date, UUID productId, UUID warehouseId, UUID tenantId,
                                       BigDecimal onHand, BigDecimal unitCost, BigDecimal valuation) {
        jdbc.update(UPSERT_INVENTORY,
                date, productId, warehouseId, tenantId,
                nz(onHand), nz(unitCost), nz(valuation));
    }

    private static BigDecimal nz(BigDecimal v) { return v == null ? BigDecimal.ZERO : v; }
}
