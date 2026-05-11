-- V7: Batch/lot tracking
CREATE TABLE product_batches (
    id                  UUID        PRIMARY KEY,
    tenant_id           UUID,
    batch_number        VARCHAR(100) NOT NULL,
    product_id          UUID        NOT NULL,
    variant_id          UUID,
    warehouse_id        UUID        NOT NULL,
    manufacturing_date  DATE,
    expiry_date         DATE,
    on_hand             NUMERIC(12,3) NOT NULL DEFAULT 0,
    reserved            NUMERIC(12,3) NOT NULL DEFAULT 0,
    status              VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT product_batches_status_chk CHECK (status IN ('ACTIVE','EXPIRED','DEPLETED')),
    CONSTRAINT product_batches_on_hand_nonneg CHECK (on_hand >= 0),
    CONSTRAINT product_batches_reserved_nonneg CHECK (reserved >= 0)
);

CREATE INDEX idx_batches_product ON product_batches (product_id);
CREATE INDEX idx_batches_warehouse ON product_batches (warehouse_id);
CREATE INDEX idx_batches_expiry ON product_batches (expiry_date) WHERE status = 'ACTIVE';
CREATE UNIQUE INDEX idx_batches_number_product ON product_batches (batch_number, product_id, warehouse_id);

ALTER TABLE stock_movements ADD COLUMN IF NOT EXISTS batch_id UUID;
CREATE INDEX IF NOT EXISTS idx_movements_batch ON stock_movements (batch_id);
