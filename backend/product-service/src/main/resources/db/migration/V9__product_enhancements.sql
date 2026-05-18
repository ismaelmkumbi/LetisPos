-- Product Service V9 — Product management enhancements
--
-- 1. supplier_id on products — link products to preferred suppliers
-- 2. price_history — audit trail of every cost/price change
-- 3. product_batches — batch/lot tracking with expiry dates

-- ==================================================================
-- 1. SUPPLIER LINK
-- ==================================================================
ALTER TABLE products ADD COLUMN supplier_id UUID;
CREATE INDEX idx_products_supplier ON products (supplier_id);

-- ==================================================================
-- 2. PRICE HISTORY — immutable audit trail
-- ==================================================================
CREATE TABLE price_history (
    id              UUID          PRIMARY KEY,
    product_id      UUID          NOT NULL,
    variant_id      UUID,
    field_name      VARCHAR(20)   NOT NULL,  -- cost | price | wholesale_price | min_price
    old_value       NUMERIC(19,4),
    new_value       NUMERIC(19,4) NOT NULL,
    changed_by      UUID,
    changed_at      TIMESTAMPTZ   NOT NULL DEFAULT now(),
    tenant_id       UUID
);
CREATE INDEX idx_ph_product  ON price_history (product_id, changed_at DESC);
CREATE INDEX idx_ph_tenant   ON price_history (tenant_id, changed_at DESC);

-- ==================================================================
-- 3. PRODUCT BATCHES — lot / batch / expiry tracking
-- ==================================================================
CREATE TABLE product_batches (
    id                  UUID          PRIMARY KEY,
    product_id          UUID          NOT NULL,
    variant_id          UUID,
    batch_number        VARCHAR(80)   NOT NULL,
    manufacturing_date  DATE,
    expiry_date         DATE,
    qty                 INTEGER       NOT NULL DEFAULT 0,
    warehouse_id        UUID,
    notes               TEXT,
    tenant_id           UUID,
    created_at          TIMESTAMPTZ   NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ   NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX idx_batches_tenant_number ON product_batches (tenant_id, lower(batch_number));
CREATE INDEX idx_batches_product  ON product_batches (product_id);
CREATE INDEX idx_batches_expiry   ON product_batches (expiry_date) WHERE expiry_date IS NOT NULL;
