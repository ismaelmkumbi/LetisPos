-- V6: Customer Groups
-- Adds group segmentation with optional discount percentage.

CREATE TABLE customer_groups (
    id               UUID         PRIMARY KEY,
    name             VARCHAR(150) NOT NULL,
    description      TEXT,
    discount_percent NUMERIC(5,2) NOT NULL DEFAULT 0 CHECK (discount_percent >= 0 AND discount_percent <= 100),
    tenant_id        UUID,
    created_at       TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at       TIMESTAMPTZ  NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX idx_customer_groups_tenant_name ON customer_groups (tenant_id, lower(name));

ALTER TABLE customers ADD COLUMN group_id UUID REFERENCES customer_groups(id) ON DELETE SET NULL;
CREATE INDEX idx_customers_group ON customers (group_id);
