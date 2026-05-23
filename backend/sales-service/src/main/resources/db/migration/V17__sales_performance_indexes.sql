-- Performance indexes for sales queries (audit recommendation L5).
-- saleRepo.search() filters by tenant + date + customer + warehouse + status + ref.
-- The composite (tenant_id, date DESC) index is the primary access path.

CREATE INDEX IF NOT EXISTS idx_sales_tenant_date
    ON sales (tenant_id, date DESC);

CREATE INDEX IF NOT EXISTS idx_sales_tenant_ref
    ON sales (tenant_id, ref);

CREATE INDEX IF NOT EXISTS idx_sales_tenant_customer
    ON sales (tenant_id, customer_id);

CREATE INDEX IF NOT EXISTS idx_sales_tenant_warehouse
    ON sales (tenant_id, warehouse_id);

CREATE INDEX IF NOT EXISTS idx_sales_tenant_status
    ON sales (tenant_id, status);

-- Supports saleRepo.findByWarehouseIdAndStatusAndConfirmedAtBetween()
CREATE INDEX IF NOT EXISTS idx_sales_warehouse_status_confirmed
    ON sales (warehouse_id, status, confirmed_at)
    WHERE status = 'CONFIRMED';

-- Supports saleRepo.findSalesByUser() GROUP BY query
CREATE INDEX IF NOT EXISTS idx_sales_tenant_user_status
    ON sales (tenant_id, user_id, status)
    WHERE status = 'CONFIRMED';

-- Supports sale_lines join for cost lookups
CREATE INDEX IF NOT EXISTS idx_sale_lines_sale_id
    ON sale_lines (sale_id);

CREATE INDEX IF NOT EXISTS idx_sale_lines_product
    ON sale_lines (product_id, variant_id);

-- Payment dedup lookup
CREATE INDEX IF NOT EXISTS idx_sale_payments_applied_payment
    ON sale_payments_applied (payment_id);

-- Outbox relay poll: published_at IS NULL ORDER BY created_at
CREATE INDEX IF NOT EXISTS idx_outbox_pending
    ON outbox (created_at)
    WHERE published_at IS NULL;
