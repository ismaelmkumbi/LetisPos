-- Supplier Returns — record goods returned to suppliers
CREATE TABLE supplier_returns (
    id UUID PRIMARY KEY,
    ref VARCHAR(50) NOT NULL UNIQUE,
    purchase_id UUID,
    supplier_id UUID,
    warehouse_id UUID NOT NULL,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    status VARCHAR(20) NOT NULL DEFAULT 'DRAFT',
    reason VARCHAR(100),
    reason_code VARCHAR(30),
    notes TEXT,
    tenant_id UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT supplier_returns_status_chk CHECK (status IN ('DRAFT','POSTED'))
);
CREATE INDEX idx_sr_purchase ON supplier_returns (purchase_id);
CREATE INDEX idx_sr_warehouse ON supplier_returns (warehouse_id);

CREATE TABLE supplier_return_lines (
    id UUID PRIMARY KEY,
    return_id UUID NOT NULL REFERENCES supplier_returns(id) ON DELETE CASCADE,
    product_id UUID NOT NULL,
    variant_id UUID,
    qty NUMERIC(12,3) NOT NULL DEFAULT 0,
    unit_cost NUMERIC(19,4),
    reason_code VARCHAR(30)
);
CREATE INDEX idx_sr_lines_return ON supplier_return_lines (return_id);
