-- Sales Service — initial schema.
-- Hosts sales, quotations, draft POS carts, returns, purchases, and the
-- idempotency + outbox plumbing.

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==================================================================
-- SALES
-- ==================================================================
CREATE TABLE sales (
    id               UUID        PRIMARY KEY,
    ref              VARCHAR(50) NOT NULL,                 -- INV-2026-000123
    date             DATE        NOT NULL DEFAULT CURRENT_DATE,
    customer_id      UUID,                                  -- ref to product_db.customers
    warehouse_id     UUID        NOT NULL,                  -- ref to inventory_db.warehouses
    user_id          UUID,
    is_pos           BOOLEAN     NOT NULL DEFAULT FALSE,
    status           VARCHAR(20) NOT NULL DEFAULT 'DRAFT',
    payment_status   VARCHAR(20) NOT NULL DEFAULT 'UNPAID',
    subtotal         NUMERIC(19,4) NOT NULL DEFAULT 0,
    tax_total        NUMERIC(19,4) NOT NULL DEFAULT 0,
    tax_rate         NUMERIC(5,2)  NOT NULL DEFAULT 0,
    tax_method       VARCHAR(20)   NOT NULL DEFAULT 'EXCLUSIVE',
    discount_total   NUMERIC(19,4) NOT NULL DEFAULT 0,
    shipping         NUMERIC(19,4) NOT NULL DEFAULT 0,
    grand_total      NUMERIC(19,4) NOT NULL DEFAULT 0,
    paid_total       NUMERIC(19,4) NOT NULL DEFAULT 0,
    currency         CHAR(3)     NOT NULL DEFAULT 'TZS',
    exchange_rate    NUMERIC(19,8) NOT NULL DEFAULT 1,
    notes            TEXT,
    tenant_id        UUID,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    confirmed_at     TIMESTAMPTZ,
    cancelled_at     TIMESTAMPTZ,
    version          BIGINT      NOT NULL DEFAULT 0,
    CONSTRAINT sales_status_chk         CHECK (status IN ('DRAFT','CONFIRMED','CANCELLED','RETURNED')),
    CONSTRAINT sales_payment_status_chk CHECK (payment_status IN ('UNPAID','PARTIAL','PAID','REFUNDED')),
    CONSTRAINT sales_tax_method_chk     CHECK (tax_method IN ('INCLUSIVE','EXCLUSIVE'))
);
CREATE UNIQUE INDEX idx_sales_tenant_ref ON sales (tenant_id, ref);
CREATE INDEX idx_sales_date        ON sales (date DESC, tenant_id);
CREATE INDEX idx_sales_customer    ON sales (customer_id);
CREATE INDEX idx_sales_warehouse   ON sales (warehouse_id, status);
CREATE INDEX idx_sales_unpaid      ON sales (payment_status) WHERE payment_status <> 'PAID';

CREATE TABLE sale_lines (
    id                     UUID        PRIMARY KEY,
    sale_id                UUID        NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
    product_id             UUID        NOT NULL,
    variant_id             UUID,
    product_name_snapshot  VARCHAR(255) NOT NULL,         -- immutable history
    product_code_snapshot  VARCHAR(64),
    unit_price             NUMERIC(19,4) NOT NULL,
    qty                    NUMERIC(19,4) NOT NULL CHECK (qty > 0),
    discount               NUMERIC(19,4) NOT NULL DEFAULT 0,
    discount_type          VARCHAR(10)   NOT NULL DEFAULT 'FIXED',
    tax_rate               NUMERIC(5,2)  NOT NULL DEFAULT 0,
    tax_method             VARCHAR(20)   NOT NULL DEFAULT 'EXCLUSIVE',
    line_subtotal          NUMERIC(19,4) NOT NULL,
    line_tax               NUMERIC(19,4) NOT NULL DEFAULT 0,
    line_total             NUMERIC(19,4) NOT NULL,
    CONSTRAINT sale_lines_discount_type_chk CHECK (discount_type IN ('FIXED','PERCENT'))
);
CREATE INDEX idx_sale_lines_sale    ON sale_lines (sale_id);
CREATE INDEX idx_sale_lines_product ON sale_lines (product_id);

-- ==================================================================
-- QUOTATIONS
-- ==================================================================
CREATE TABLE quotations (
    id                 UUID        PRIMARY KEY,
    ref                VARCHAR(50) NOT NULL,
    date               DATE        NOT NULL DEFAULT CURRENT_DATE,
    customer_id        UUID,
    warehouse_id       UUID        NOT NULL,
    user_id            UUID,
    status             VARCHAR(20) NOT NULL DEFAULT 'DRAFT',
    subtotal           NUMERIC(19,4) NOT NULL DEFAULT 0,
    tax_total          NUMERIC(19,4) NOT NULL DEFAULT 0,
    tax_rate           NUMERIC(5,2)  NOT NULL DEFAULT 0,
    tax_method         VARCHAR(20)   NOT NULL DEFAULT 'EXCLUSIVE',
    discount_total     NUMERIC(19,4) NOT NULL DEFAULT 0,
    shipping           NUMERIC(19,4) NOT NULL DEFAULT 0,
    grand_total        NUMERIC(19,4) NOT NULL DEFAULT 0,
    currency           CHAR(3)     NOT NULL DEFAULT 'TZS',
    exchange_rate      NUMERIC(19,8) NOT NULL DEFAULT 1,
    notes              TEXT,
    converted_sale_id  UUID,
    tenant_id          UUID,
    created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT quotations_status_chk CHECK (status IN ('DRAFT','SENT','ACCEPTED','REJECTED','CONVERTED'))
);
CREATE UNIQUE INDEX idx_quotations_tenant_ref ON quotations (tenant_id, ref);
CREATE INDEX idx_quotations_customer ON quotations (customer_id);

CREATE TABLE quotation_lines (
    id                     UUID        PRIMARY KEY,
    quotation_id           UUID        NOT NULL REFERENCES quotations(id) ON DELETE CASCADE,
    product_id             UUID        NOT NULL,
    variant_id             UUID,
    product_name_snapshot  VARCHAR(255) NOT NULL,
    product_code_snapshot  VARCHAR(64),
    unit_price             NUMERIC(19,4) NOT NULL,
    qty                    NUMERIC(19,4) NOT NULL CHECK (qty > 0),
    discount               NUMERIC(19,4) NOT NULL DEFAULT 0,
    discount_type          VARCHAR(10)   NOT NULL DEFAULT 'FIXED',
    tax_rate               NUMERIC(5,2)  NOT NULL DEFAULT 0,
    tax_method             VARCHAR(20)   NOT NULL DEFAULT 'EXCLUSIVE',
    line_subtotal          NUMERIC(19,4) NOT NULL,
    line_tax               NUMERIC(19,4) NOT NULL DEFAULT 0,
    line_total             NUMERIC(19,4) NOT NULL,
    CONSTRAINT quotation_lines_discount_type_chk CHECK (discount_type IN ('FIXED','PERCENT'))
);
CREATE INDEX idx_quotation_lines_quote ON quotation_lines (quotation_id);

-- ==================================================================
-- DRAFT SALES (POS resumable carts; JSONB payload)
-- ==================================================================
CREATE TABLE draft_sales (
    id            UUID        PRIMARY KEY,
    user_id       UUID        NOT NULL,
    warehouse_id  UUID        NOT NULL,
    customer_id   UUID,
    label         VARCHAR(80),
    data          JSONB       NOT NULL,
    tenant_id     UUID,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_drafts_user ON draft_sales (user_id, updated_at DESC);

-- ==================================================================
-- SALES RETURNS
-- ==================================================================
CREATE TABLE sale_returns (
    id            UUID        PRIMARY KEY,
    ref           VARCHAR(50) NOT NULL,
    date          DATE        NOT NULL DEFAULT CURRENT_DATE,
    sale_id       UUID        NOT NULL REFERENCES sales(id),
    customer_id   UUID,
    warehouse_id  UUID        NOT NULL,
    user_id       UUID,
    reason        VARCHAR(200),
    status        VARCHAR(20) NOT NULL DEFAULT 'CONFIRMED',
    subtotal      NUMERIC(19,4) NOT NULL DEFAULT 0,
    tax_total     NUMERIC(19,4) NOT NULL DEFAULT 0,
    grand_total   NUMERIC(19,4) NOT NULL DEFAULT 0,
    tenant_id     UUID,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT sale_returns_status_chk CHECK (status IN ('DRAFT','CONFIRMED','CANCELLED'))
);
CREATE UNIQUE INDEX idx_sale_returns_tenant_ref ON sale_returns (tenant_id, ref);
CREATE INDEX idx_sale_returns_sale ON sale_returns (sale_id);

CREATE TABLE sale_return_lines (
    id         UUID        PRIMARY KEY,
    return_id  UUID        NOT NULL REFERENCES sale_returns(id) ON DELETE CASCADE,
    product_id UUID        NOT NULL,
    variant_id UUID,
    product_name_snapshot VARCHAR(255) NOT NULL,
    unit_price NUMERIC(19,4) NOT NULL,
    qty        NUMERIC(19,4) NOT NULL CHECK (qty > 0),
    line_total NUMERIC(19,4) NOT NULL
);
CREATE INDEX idx_sale_return_lines_return ON sale_return_lines (return_id);

-- ==================================================================
-- PURCHASES  (mirror of sales, with supplier_id; receiving increments stock)
-- ==================================================================
CREATE TABLE purchases (
    id              UUID        PRIMARY KEY,
    ref             VARCHAR(50) NOT NULL,
    date            DATE        NOT NULL DEFAULT CURRENT_DATE,
    supplier_id     UUID,                                   -- ref to product_db.suppliers
    warehouse_id    UUID        NOT NULL,
    user_id         UUID,
    status          VARCHAR(20) NOT NULL DEFAULT 'DRAFT',
    payment_status  VARCHAR(20) NOT NULL DEFAULT 'UNPAID',
    subtotal        NUMERIC(19,4) NOT NULL DEFAULT 0,
    tax_total       NUMERIC(19,4) NOT NULL DEFAULT 0,
    tax_rate        NUMERIC(5,2)  NOT NULL DEFAULT 0,
    tax_method      VARCHAR(20)   NOT NULL DEFAULT 'EXCLUSIVE',
    discount_total  NUMERIC(19,4) NOT NULL DEFAULT 0,
    shipping        NUMERIC(19,4) NOT NULL DEFAULT 0,
    grand_total     NUMERIC(19,4) NOT NULL DEFAULT 0,
    paid_total      NUMERIC(19,4) NOT NULL DEFAULT 0,
    currency        CHAR(3)     NOT NULL DEFAULT 'TZS',
    exchange_rate   NUMERIC(19,8) NOT NULL DEFAULT 1,
    notes           TEXT,
    tenant_id       UUID,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    received_at     TIMESTAMPTZ,
    version         BIGINT      NOT NULL DEFAULT 0,
    CONSTRAINT purchases_status_chk CHECK (status IN ('DRAFT','ORDERED','RECEIVED','CANCELLED')),
    CONSTRAINT purchases_payment_status_chk CHECK (payment_status IN ('UNPAID','PARTIAL','PAID','REFUNDED'))
);
CREATE UNIQUE INDEX idx_purchases_tenant_ref ON purchases (tenant_id, ref);
CREATE INDEX idx_purchases_supplier  ON purchases (supplier_id);
CREATE INDEX idx_purchases_warehouse ON purchases (warehouse_id, status);

CREATE TABLE purchase_lines (
    id                     UUID        PRIMARY KEY,
    purchase_id            UUID        NOT NULL REFERENCES purchases(id) ON DELETE CASCADE,
    product_id             UUID        NOT NULL,
    variant_id             UUID,
    product_name_snapshot  VARCHAR(255) NOT NULL,
    product_code_snapshot  VARCHAR(64),
    unit_cost              NUMERIC(19,4) NOT NULL,
    qty                    NUMERIC(19,4) NOT NULL CHECK (qty > 0),
    discount               NUMERIC(19,4) NOT NULL DEFAULT 0,
    discount_type          VARCHAR(10)   NOT NULL DEFAULT 'FIXED',
    tax_rate               NUMERIC(5,2)  NOT NULL DEFAULT 0,
    tax_method             VARCHAR(20)   NOT NULL DEFAULT 'EXCLUSIVE',
    line_subtotal          NUMERIC(19,4) NOT NULL,
    line_tax               NUMERIC(19,4) NOT NULL DEFAULT 0,
    line_total             NUMERIC(19,4) NOT NULL
);
CREATE INDEX idx_purchase_lines_purchase ON purchase_lines (purchase_id);

CREATE TABLE purchase_returns (
    id             UUID        PRIMARY KEY,
    ref            VARCHAR(50) NOT NULL,
    date           DATE        NOT NULL DEFAULT CURRENT_DATE,
    purchase_id    UUID        NOT NULL REFERENCES purchases(id),
    supplier_id    UUID,
    warehouse_id   UUID        NOT NULL,
    user_id        UUID,
    reason         VARCHAR(200),
    status         VARCHAR(20) NOT NULL DEFAULT 'CONFIRMED',
    grand_total    NUMERIC(19,4) NOT NULL DEFAULT 0,
    tenant_id      UUID,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT purchase_returns_status_chk CHECK (status IN ('DRAFT','CONFIRMED','CANCELLED'))
);
CREATE UNIQUE INDEX idx_purchase_returns_tenant_ref ON purchase_returns (tenant_id, ref);

CREATE TABLE purchase_return_lines (
    id         UUID        PRIMARY KEY,
    return_id  UUID        NOT NULL REFERENCES purchase_returns(id) ON DELETE CASCADE,
    product_id UUID        NOT NULL,
    variant_id UUID,
    product_name_snapshot VARCHAR(255) NOT NULL,
    unit_price NUMERIC(19,4) NOT NULL,
    qty        NUMERIC(19,4) NOT NULL CHECK (qty > 0),
    line_total NUMERIC(19,4) NOT NULL
);
CREATE INDEX idx_purchase_return_lines_return ON purchase_return_lines (return_id);

-- ==================================================================
-- IDEMPOTENCY + OUTBOX
-- ==================================================================
CREATE TABLE idempotency_keys (
    key_value   VARCHAR(100) PRIMARY KEY,
    method      VARCHAR(10)  NOT NULL,
    path        VARCHAR(255) NOT NULL,
    response    JSONB,
    status_code INT,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT now(),
    expires_at  TIMESTAMPTZ  NOT NULL
);
CREATE INDEX idx_idem_expires ON idempotency_keys (expires_at);

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
