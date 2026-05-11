-- Goods Receipts — record stock received from a purchase order
CREATE TABLE goods_receipts (
    id UUID PRIMARY KEY, ref VARCHAR(50) NOT NULL UNIQUE,
    purchase_id UUID, supplier_id UUID, warehouse_id UUID NOT NULL,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    status VARCHAR(20) NOT NULL DEFAULT 'DRAFT',
    notes TEXT, tenant_id UUID, created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT goods_receipts_status_chk CHECK (status IN ('DRAFT','POSTED'))
);
CREATE INDEX idx_gr_purchase ON goods_receipts (purchase_id);
CREATE INDEX idx_gr_warehouse ON goods_receipts (warehouse_id);

CREATE TABLE goods_receipt_lines (
    id UUID PRIMARY KEY, receipt_id UUID NOT NULL REFERENCES goods_receipts(id) ON DELETE CASCADE,
    product_id UUID NOT NULL, variant_id UUID,
    ordered_qty NUMERIC(12,3) NOT NULL DEFAULT 0,
    received_qty NUMERIC(12,3) NOT NULL DEFAULT 0, unit_cost NUMERIC(19,4)
);
CREATE INDEX idx_gr_lines_receipt ON goods_receipt_lines (receipt_id);
