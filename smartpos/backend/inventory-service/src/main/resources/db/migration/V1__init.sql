-- Inventory Service — initial schema
-- Owns warehouses, per-warehouse stock (with optimistic locking), full stock
-- movement ledger, reservations, transfers, adjustments, stock counts.

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ------------------------------------------------------------------
-- Warehouses
-- ------------------------------------------------------------------
CREATE TABLE warehouses (
    id          UUID        PRIMARY KEY,
    code        VARCHAR(50),
    name        VARCHAR(150) NOT NULL,
    city        VARCHAR(100),
    country     VARCHAR(100),
    phone       VARCHAR(32),
    email       VARCHAR(150),
    zip         VARCHAR(20),
    notes       TEXT,
    is_active   BOOLEAN     NOT NULL DEFAULT TRUE,
    tenant_id   UUID,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX idx_warehouses_tenant_code ON warehouses (tenant_id, lower(code)) WHERE code IS NOT NULL;

-- ------------------------------------------------------------------
-- Stock levels  — THE hot table. Per (product, variant, warehouse).
--   on_hand   = total units physically in the warehouse
--   reserved  = units promised to active sales (not yet deducted)
--   available = on_hand - reserved  (never stored; computed)
-- Optimistic lock via version column for concurrent POS writes.
-- ------------------------------------------------------------------
CREATE TABLE stock_levels (
    id                      UUID        PRIMARY KEY,
    product_id              UUID        NOT NULL,
    variant_id              UUID,
    warehouse_id            UUID        NOT NULL REFERENCES warehouses(id) ON DELETE RESTRICT,
    on_hand                 NUMERIC(19,4) NOT NULL DEFAULT 0,
    reserved                NUMERIC(19,4) NOT NULL DEFAULT 0,
    stock_alert_threshold   INT         NOT NULL DEFAULT 0,    -- denormalised from product
    tenant_id               UUID,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
    version                 BIGINT      NOT NULL DEFAULT 0,
    CONSTRAINT stock_levels_on_hand_nonneg  CHECK (on_hand  >= 0),
    CONSTRAINT stock_levels_reserved_nonneg CHECK (reserved >= 0),
    CONSTRAINT stock_levels_reserved_le_on_hand CHECK (reserved <= on_hand)
);
-- One row per (product, variant, warehouse). NULL variant_id means "no variant".
CREATE UNIQUE INDEX idx_stock_levels_pvw
    ON stock_levels (product_id, COALESCE(variant_id, '00000000-0000-0000-0000-000000000000'), warehouse_id);
CREATE INDEX idx_stock_levels_warehouse ON stock_levels (warehouse_id);
CREATE INDEX idx_stock_levels_low
    ON stock_levels (warehouse_id)
    WHERE (on_hand - reserved) <= stock_alert_threshold;

-- ------------------------------------------------------------------
-- Stock movement ledger — append-only, source of truth for reconciliation.
-- BRIN index is ideal for append-only time-ordered data.
-- ------------------------------------------------------------------
CREATE TABLE stock_movements (
    id              UUID        PRIMARY KEY,
    product_id      UUID        NOT NULL,
    variant_id      UUID,
    warehouse_id    UUID        NOT NULL,
    movement_type   VARCHAR(30) NOT NULL,    -- PURCHASE_IN, SALE_OUT, RETURN_IN, RETURN_OUT,
                                             -- TRANSFER_OUT, TRANSFER_IN, ADJUSTMENT, COUNT
    qty_delta       NUMERIC(19,4) NOT NULL,  -- signed
    unit_cost       NUMERIC(19,4),
    reference_type  VARCHAR(30),             -- SALE | PURCHASE | TRANSFER | ADJUSTMENT | COUNT
    reference_id    UUID,
    user_id         UUID,
    tenant_id       UUID,
    notes           TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_movements_product_time ON stock_movements (product_id, created_at DESC);
CREATE INDEX idx_movements_reference    ON stock_movements (reference_type, reference_id);
CREATE INDEX idx_movements_warehouse    ON stock_movements (warehouse_id, created_at DESC);
CREATE INDEX idx_movements_created_brin ON stock_movements USING brin (created_at);

-- ------------------------------------------------------------------
-- Stock reservations — in-flight sales holding stock.
--   lines JSONB contains: [{productId, variantId, warehouseId, qty}, ...]
-- Unique per sale_id so retries are idempotent.
-- ------------------------------------------------------------------
CREATE TABLE stock_reservations (
    id           UUID        PRIMARY KEY,
    sale_id      UUID        NOT NULL UNIQUE,
    lines        JSONB       NOT NULL,
    expires_at   TIMESTAMPTZ NOT NULL,
    status       VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',  -- ACTIVE | COMMITTED | RELEASED | EXPIRED
    user_id      UUID,
    tenant_id    UUID,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    committed_at TIMESTAMPTZ,
    released_at  TIMESTAMPTZ,
    CONSTRAINT stock_reservations_status_chk CHECK (status IN ('ACTIVE','COMMITTED','RELEASED','EXPIRED'))
);
CREATE INDEX idx_reservations_expiring ON stock_reservations (expires_at) WHERE status = 'ACTIVE';

-- ------------------------------------------------------------------
-- Transfers between warehouses
-- ------------------------------------------------------------------
CREATE TABLE transfers (
    id                UUID        PRIMARY KEY,
    ref               VARCHAR(50) NOT NULL UNIQUE,
    date              DATE        NOT NULL DEFAULT CURRENT_DATE,
    from_warehouse_id UUID        NOT NULL REFERENCES warehouses(id),
    to_warehouse_id   UUID        NOT NULL REFERENCES warehouses(id),
    user_id           UUID,
    status            VARCHAR(20) NOT NULL DEFAULT 'DRAFT',    -- DRAFT | IN_TRANSIT | COMPLETED | CANCELLED
    notes             TEXT,
    tenant_id         UUID,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT transfers_diff_warehouses CHECK (from_warehouse_id <> to_warehouse_id),
    CONSTRAINT transfers_status_chk CHECK (status IN ('DRAFT','IN_TRANSIT','COMPLETED','CANCELLED'))
);
CREATE INDEX idx_transfers_from ON transfers (from_warehouse_id, date DESC);
CREATE INDEX idx_transfers_to   ON transfers (to_warehouse_id,   date DESC);
CREATE INDEX idx_transfers_status ON transfers (status);

CREATE TABLE transfer_lines (
    id          UUID        PRIMARY KEY,
    transfer_id UUID        NOT NULL REFERENCES transfers(id) ON DELETE CASCADE,
    product_id  UUID        NOT NULL,
    variant_id  UUID,
    qty         NUMERIC(19,4) NOT NULL CHECK (qty > 0),
    unit_cost   NUMERIC(19,4)
);
CREATE INDEX idx_transfer_lines_transfer ON transfer_lines (transfer_id);

-- ------------------------------------------------------------------
-- Stock adjustments (manual +/- with reason)
-- ------------------------------------------------------------------
CREATE TABLE adjustments (
    id           UUID        PRIMARY KEY,
    ref          VARCHAR(50) NOT NULL UNIQUE,
    date         DATE        NOT NULL DEFAULT CURRENT_DATE,
    warehouse_id UUID        NOT NULL REFERENCES warehouses(id),
    user_id      UUID,
    reason       VARCHAR(100),
    notes        TEXT,
    tenant_id    UUID,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_adjustments_warehouse ON adjustments (warehouse_id, date DESC);

CREATE TABLE adjustment_lines (
    id            UUID        PRIMARY KEY,
    adjustment_id UUID        NOT NULL REFERENCES adjustments(id) ON DELETE CASCADE,
    product_id    UUID        NOT NULL,
    variant_id    UUID,
    qty_delta     NUMERIC(19,4) NOT NULL  -- signed
);
CREATE INDEX idx_adjustment_lines_adj ON adjustment_lines (adjustment_id);

-- ------------------------------------------------------------------
-- Stock counts (physical inventory session)
-- ------------------------------------------------------------------
CREATE TABLE stock_counts (
    id           UUID        PRIMARY KEY,
    ref          VARCHAR(50) NOT NULL UNIQUE,
    warehouse_id UUID        NOT NULL REFERENCES warehouses(id),
    user_id      UUID,
    status       VARCHAR(20) NOT NULL DEFAULT 'OPEN',     -- OPEN | POSTED | CANCELLED
    notes        TEXT,
    tenant_id    UUID,
    started_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    posted_at    TIMESTAMPTZ,
    CONSTRAINT stock_counts_status_chk CHECK (status IN ('OPEN','POSTED','CANCELLED'))
);

CREATE TABLE stock_count_lines (
    id          UUID        PRIMARY KEY,
    count_id    UUID        NOT NULL REFERENCES stock_counts(id) ON DELETE CASCADE,
    product_id  UUID        NOT NULL,
    variant_id  UUID,
    system_qty  NUMERIC(19,4) NOT NULL,
    counted_qty NUMERIC(19,4) NOT NULL,
    difference  NUMERIC(19,4) GENERATED ALWAYS AS (counted_qty - system_qty) STORED
);
CREATE INDEX idx_count_lines_count ON stock_count_lines (count_id);

-- ------------------------------------------------------------------
-- Outbox
-- ------------------------------------------------------------------
CREATE TABLE outbox (
    id             UUID        PRIMARY KEY,
    aggregate_type VARCHAR(50) NOT NULL,
    aggregate_id   UUID        NOT NULL,
    event_type     VARCHAR(80) NOT NULL,
    payload        JSONB       NOT NULL,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    published_at   TIMESTAMPTZ
);
CREATE INDEX idx_outbox_unpublished ON outbox (created_at) WHERE published_at IS NULL;
