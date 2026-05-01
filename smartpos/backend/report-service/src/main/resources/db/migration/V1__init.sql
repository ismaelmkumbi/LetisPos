-- Report Service — initial schema.
--
-- Read model / OLAP projections. Populated by CDC event consumers (planned in
-- Phase 6b once the Kafka outbox relay lands). For Phase 6 v1 all queries
-- aggregate live via Feign to source services — these tables are empty
-- placeholders ready for when events start flowing.

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==================================================================
-- FACT: sales by day / warehouse / user / customer
-- ==================================================================
CREATE TABLE fact_sales_daily (
    id              UUID        PRIMARY KEY,
    date            DATE        NOT NULL,
    warehouse_id    UUID,
    user_id         UUID,
    customer_id     UUID,
    tenant_id       UUID,
    sales_count     INT         NOT NULL DEFAULT 0,
    gross           NUMERIC(19,4) NOT NULL DEFAULT 0,
    tax             NUMERIC(19,4) NOT NULL DEFAULT 0,
    discount        NUMERIC(19,4) NOT NULL DEFAULT 0,
    net             NUMERIC(19,4) NOT NULL DEFAULT 0,
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
-- Postgres doesn't allow expressions inside an inline UNIQUE constraint,
-- so we use a unique INDEX on COALESCE'd columns instead.
CREATE UNIQUE INDEX uq_fact_sales_daily_bucket
    ON fact_sales_daily (
        date,
        COALESCE(warehouse_id, '00000000-0000-0000-0000-000000000000'),
        COALESCE(user_id,      '00000000-0000-0000-0000-000000000000'),
        COALESCE(customer_id,  '00000000-0000-0000-0000-000000000000'),
        COALESCE(tenant_id,    '00000000-0000-0000-0000-000000000000')
    );
CREATE INDEX idx_fact_sales_date      ON fact_sales_daily (date DESC);
CREATE INDEX idx_fact_sales_warehouse ON fact_sales_daily (warehouse_id, date DESC);
CREATE INDEX idx_fact_sales_customer  ON fact_sales_daily (customer_id);

-- ==================================================================
-- FACT: product sales by day
-- ==================================================================
CREATE TABLE fact_product_sales_daily (
    id              UUID        PRIMARY KEY,
    date            DATE        NOT NULL,
    product_id      UUID        NOT NULL,
    warehouse_id    UUID,
    tenant_id       UUID,
    qty             NUMERIC(19,4) NOT NULL DEFAULT 0,
    gross           NUMERIC(19,4) NOT NULL DEFAULT 0,
    tax             NUMERIC(19,4) NOT NULL DEFAULT 0,
    net             NUMERIC(19,4) NOT NULL DEFAULT 0,
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX uq_fact_product_sales_daily_bucket
    ON fact_product_sales_daily (
        date, product_id,
        COALESCE(warehouse_id, '00000000-0000-0000-0000-000000000000'),
        COALESCE(tenant_id,    '00000000-0000-0000-0000-000000000000')
    );
CREATE INDEX idx_fact_product_sales_product ON fact_product_sales_daily (product_id, date DESC);
CREATE INDEX idx_fact_product_sales_date    ON fact_product_sales_daily (date DESC);

-- ==================================================================
-- FACT: inventory snapshot (periodic)
-- ==================================================================
CREATE TABLE fact_inventory_snapshot (
    id              UUID        PRIMARY KEY,
    snapshot_date   DATE        NOT NULL,
    product_id      UUID        NOT NULL,
    warehouse_id    UUID        NOT NULL,
    tenant_id       UUID,
    on_hand         NUMERIC(19,4) NOT NULL DEFAULT 0,
    unit_cost       NUMERIC(19,4) NOT NULL DEFAULT 0,
    valuation       NUMERIC(19,4) NOT NULL DEFAULT 0,
    UNIQUE (snapshot_date, product_id, warehouse_id)
);
CREATE INDEX idx_fact_inv_snapshot_date ON fact_inventory_snapshot (snapshot_date DESC);

-- ==================================================================
-- FACT: payments by day / account / method
-- ==================================================================
CREATE TABLE fact_payments_daily (
    id              UUID        PRIMARY KEY,
    date            DATE        NOT NULL,
    account_id      UUID        NOT NULL,
    method          VARCHAR(30) NOT NULL,
    tenant_id       UUID,
    amount_in       NUMERIC(19,4) NOT NULL DEFAULT 0,
    amount_out      NUMERIC(19,4) NOT NULL DEFAULT 0,
    txn_count       INT         NOT NULL DEFAULT 0
);
CREATE UNIQUE INDEX uq_fact_payments_daily_bucket
    ON fact_payments_daily (
        date, account_id, method,
        COALESCE(tenant_id, '00000000-0000-0000-0000-000000000000')
    );
CREATE INDEX idx_fact_payments_account ON fact_payments_daily (account_id, date DESC);

-- ==================================================================
-- Async export jobs (placeholder for Phase 6b — MinIO wiring).
-- Phase 6 v1 returns export bytes synchronously; this table is here so the
-- frontend can use the same /export endpoint when we switch to async.
-- ==================================================================
CREATE TABLE export_jobs (
    id            UUID        PRIMARY KEY,
    user_id       UUID,
    report_key    VARCHAR(80) NOT NULL,
    params        JSONB       NOT NULL DEFAULT '{}',
    format        VARCHAR(10) NOT NULL,      -- PDF | XLSX | CSV
    status        VARCHAR(20) NOT NULL DEFAULT 'PENDING',  -- PENDING | RUNNING | READY | FAILED
    file_url      TEXT,
    file_size     BIGINT,
    error         TEXT,
    tenant_id     UUID,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    completed_at  TIMESTAMPTZ,
    CONSTRAINT export_jobs_status_chk CHECK (status IN ('PENDING','RUNNING','READY','FAILED')),
    CONSTRAINT export_jobs_format_chk CHECK (format IN ('PDF','XLSX','CSV'))
);
CREATE INDEX idx_export_jobs_user ON export_jobs (user_id, created_at DESC);
