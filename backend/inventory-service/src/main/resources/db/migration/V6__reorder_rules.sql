CREATE TABLE reorder_rules (
    id              UUID        PRIMARY KEY,
    tenant_id       UUID,
    product_id      UUID        NOT NULL,
    variant_id      UUID,
    warehouse_id    UUID        NOT NULL,
    min_qty         NUMERIC(12,3) NOT NULL,
    reorder_qty     NUMERIC(12,3) NOT NULL DEFAULT 1,
    supplier_id     UUID,
    active          BOOLEAN     NOT NULL DEFAULT true,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_reorder_rules_warehouse ON reorder_rules (warehouse_id);
CREATE INDEX idx_reorder_rules_product ON reorder_rules (product_id);
