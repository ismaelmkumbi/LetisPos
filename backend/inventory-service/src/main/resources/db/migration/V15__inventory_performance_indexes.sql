-- Performance indexes for inventory stock operations (audit recommendation L5).
-- The stock_levels table is the hottest path (POS reservations use PESSIMISTIC_WRITE).

-- Primary lookup: product + variant + warehouse + tenant (used by findForUpdate)
-- Already likely covered by init migration; ensure it exists.
CREATE INDEX IF NOT EXISTS idx_stock_levels_product_warehouse
    ON stock_levels (product_id, variant_id, warehouse_id, tenant_id);

-- Batch lookup: many products in one warehouse
CREATE INDEX IF NOT EXISTS idx_stock_levels_warehouse_products
    ON stock_levels (warehouse_id, product_id)
    WHERE variant_id IS NULL;

-- Low stock queries use a partial index
CREATE INDEX IF NOT EXISTS idx_stock_levels_low_stock
    ON stock_levels (warehouse_id, tenant_id)
    WHERE (on_hand - reserved) <= stock_alert_threshold
      AND stock_alert_threshold > 0;

-- Reservation lookups by sale_id (idempotency check)
CREATE INDEX IF NOT EXISTS idx_stock_reservations_sale
    ON stock_reservations (sale_id);

-- Stock movements by reference (reverse lookup for audit)
CREATE INDEX IF NOT EXISTS idx_stock_movements_reference
    ON stock_movements (reference_type, reference_id);

-- Outbox relay
CREATE INDEX IF NOT EXISTS idx_outbox_pending
    ON outbox (created_at)
    WHERE published_at IS NULL;
