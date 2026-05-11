CREATE TABLE suspended_sales (
    id              UUID            NOT NULL PRIMARY KEY,
    ref             VARCHAR(50)     NOT NULL,
    tenant_id       UUID            NOT NULL,
    terminal_id     UUID,
    user_id         UUID,
    customer_id     UUID,
    warehouse_id    UUID,
    lines           JSONB,
    discount_type   VARCHAR(20),
    discount_value  DECIMAL(15,2),
    tax_method      VARCHAR(20),
    notes           VARCHAR(500),
    status          VARCHAR(20)     NOT NULL,
    grand_total     DECIMAL(15,2),
    total_items     INT,
    expires_at      TIMESTAMPTZ,
    created_at      TIMESTAMPTZ     NOT NULL,
    updated_at      TIMESTAMPTZ     NOT NULL
);

CREATE INDEX idx_suspended_sales_tenant ON suspended_sales (tenant_id);
CREATE INDEX idx_suspended_sales_status ON suspended_sales (status);
