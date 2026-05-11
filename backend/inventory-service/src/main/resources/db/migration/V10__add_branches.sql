CREATE TABLE branches (
    id UUID PRIMARY KEY,
    name VARCHAR(120) NOT NULL,
    code VARCHAR(30) NOT NULL,
    address VARCHAR(255),
    city VARCHAR(100),
    phone VARCHAR(30),
    active BOOLEAN NOT NULL DEFAULT TRUE,
    tenant_id UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(tenant_id, code)
);

ALTER TABLE warehouses ADD COLUMN IF NOT EXISTS branch_id UUID REFERENCES branches(id);
