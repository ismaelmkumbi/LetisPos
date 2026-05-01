-- Sales Service V3 — Recurring invoices / subscriptions
--
-- A recurring invoice describes a template (customer, warehouse, line items)
-- and a schedule (frequency + interval + start/end). A scheduler runs daily
-- and, for every ACTIVE template whose next_run_date <= today, materialises a
-- Sale and advances next_run_date by the period.
--
-- Keeping the line definition normalized (vs. JSONB) makes pricing/edits easy
-- and lets reports join through to products.

-- ==================================================================
-- Recurring invoice header
-- ==================================================================
CREATE TABLE recurring_invoices (
    id                  UUID          PRIMARY KEY,
    ref                 VARCHAR(50)   NOT NULL,
    name                VARCHAR(150),                          -- human label, e.g. "Monthly cleaning - ACME"
    customer_id         UUID,                                  -- references product-service.customers
    warehouse_id        UUID          NOT NULL,                -- references inventory-service.warehouses
    frequency           VARCHAR(16)   NOT NULL,                -- DAILY | WEEKLY | MONTHLY | YEARLY
    interval_count      INT           NOT NULL DEFAULT 1,      -- every N units of frequency
    start_date          DATE          NOT NULL,
    end_date            DATE,                                  -- null = open-ended
    next_run_date       DATE          NOT NULL,
    last_run_date       DATE,
    occurrences_max     INT,                                   -- null = unlimited
    occurrences_count   INT           NOT NULL DEFAULT 0,
    status              VARCHAR(16)   NOT NULL DEFAULT 'ACTIVE', -- ACTIVE | PAUSED | COMPLETED | CANCELLED
    currency            CHAR(3)       NOT NULL DEFAULT 'TZS',
    discount            NUMERIC(19,4),
    shipping            NUMERIC(19,4),
    tax_method          VARCHAR(16),
    notes               TEXT,
    send_notification   BOOLEAN       NOT NULL DEFAULT TRUE,   -- email/SMS receipt on each run
    tenant_id           UUID,
    created_at          TIMESTAMPTZ   NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ   NOT NULL DEFAULT now(),
    deleted_at          TIMESTAMPTZ,
    version             BIGINT        NOT NULL DEFAULT 0,
    CONSTRAINT recurring_freq_chk   CHECK (frequency IN ('DAILY','WEEKLY','MONTHLY','YEARLY')),
    CONSTRAINT recurring_status_chk CHECK (status    IN ('ACTIVE','PAUSED','COMPLETED','CANCELLED'))
);
CREATE UNIQUE INDEX idx_recurring_tenant_ref ON recurring_invoices (tenant_id, ref) WHERE deleted_at IS NULL;
CREATE INDEX idx_recurring_status_next ON recurring_invoices (status, next_run_date) WHERE deleted_at IS NULL;
CREATE INDEX idx_recurring_customer ON recurring_invoices (customer_id) WHERE deleted_at IS NULL;

-- ==================================================================
-- Recurring invoice lines (template items)
-- ==================================================================
CREATE TABLE recurring_invoice_lines (
    id                       UUID          PRIMARY KEY,
    recurring_invoice_id     UUID          NOT NULL REFERENCES recurring_invoices(id) ON DELETE CASCADE,
    product_id               UUID          NOT NULL,
    variant_id               UUID,
    product_name_snapshot    VARCHAR(255),
    product_code_snapshot    VARCHAR(64),
    qty                      NUMERIC(19,4) NOT NULL DEFAULT 1,
    unit_price               NUMERIC(19,4) NOT NULL,
    discount                 NUMERIC(19,4),
    discount_type            VARCHAR(16),
    tax_rate                 NUMERIC(5,2),
    tax_method               VARCHAR(16),
    position                 INT           NOT NULL DEFAULT 0,
    UNIQUE (recurring_invoice_id, position)
);
CREATE INDEX idx_recurring_lines_parent ON recurring_invoice_lines (recurring_invoice_id);

-- ==================================================================
-- Optional link from generated Sales back to their template
-- ==================================================================
ALTER TABLE sales
    ADD COLUMN recurring_invoice_id UUID REFERENCES recurring_invoices(id) ON DELETE SET NULL;
CREATE INDEX idx_sales_recurring ON sales (recurring_invoice_id) WHERE recurring_invoice_id IS NOT NULL;
