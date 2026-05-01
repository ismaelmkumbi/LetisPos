-- Report Service V3 — advanced reports support
--
-- Adds two structures:
--   inventory_cost_batches : per-receipt cost layer used for FIFO valuation.
--                             Populated from PurchaseReceived events.
--   product_meta           : light dimension table (name/code/category/brand/cost)
--                             so reports can render without round-tripping to
--                             product-service for every row. Refreshed on
--                             ProductCreated/Updated events.

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==================================================================
-- FIFO cost layers
-- ==================================================================
CREATE TABLE inventory_cost_batches (
    id              UUID         PRIMARY KEY,
    received_at     TIMESTAMPTZ  NOT NULL DEFAULT now(),
    product_id      UUID         NOT NULL,
    warehouse_id    UUID         NOT NULL,
    qty_received    NUMERIC(19,4) NOT NULL,
    qty_remaining   NUMERIC(19,4) NOT NULL,
    unit_cost       NUMERIC(19,4) NOT NULL,
    source_ref      VARCHAR(80),                              -- purchase receipt / adjustment id
    tenant_id       UUID
);
CREATE INDEX idx_cost_batches_fifo
    ON inventory_cost_batches (product_id, warehouse_id, received_at)
    WHERE qty_remaining > 0;
CREATE INDEX idx_cost_batches_received ON inventory_cost_batches (received_at DESC);

-- ==================================================================
-- Product dimension table (denormalised — refreshed by event consumer)
-- ==================================================================
CREATE TABLE product_meta (
    product_id        UUID         PRIMARY KEY,
    code              VARCHAR(64)  NOT NULL,
    name              VARCHAR(255) NOT NULL,
    category_id       UUID,
    category_name     VARCHAR(150),
    brand_id          UUID,
    brand_name        VARCHAR(150),
    unit_id           UUID,
    cost              NUMERIC(19,4),
    price             NUMERIC(19,4),
    warranty_months   INT,
    track_serial      BOOLEAN      NOT NULL DEFAULT FALSE,
    tenant_id         UUID,
    updated_at        TIMESTAMPTZ  NOT NULL DEFAULT now()
);
CREATE INDEX idx_product_meta_category ON product_meta (category_id);
CREATE INDEX idx_product_meta_brand    ON product_meta (brand_id);
