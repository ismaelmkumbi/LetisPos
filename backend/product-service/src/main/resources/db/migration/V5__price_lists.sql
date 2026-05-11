-- V5: Price lists with quantity tiers

CREATE TABLE price_lists (
    id              UUID        PRIMARY KEY,
    tenant_id       UUID,
    name            VARCHAR(150) NOT NULL,
    description     TEXT,
    customer_group  VARCHAR(100),
    currency        VARCHAR(3)   NOT NULL DEFAULT 'TZS',
    active          BOOLEAN      NOT NULL DEFAULT true,
    start_date      DATE,
    end_date        DATE,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX idx_price_lists_tenant ON price_lists (tenant_id);
CREATE INDEX idx_price_lists_active ON price_lists (active) WHERE active = true;

CREATE TABLE price_list_lines (
    id              UUID        PRIMARY KEY,
    price_list_id   UUID        NOT NULL REFERENCES price_lists(id) ON DELETE CASCADE,
    product_id      UUID        NOT NULL,
    variant_id      UUID,
    price           NUMERIC(19,4) NOT NULL,
    min_qty         NUMERIC(12,3) NOT NULL DEFAULT 1,
    max_qty         NUMERIC(12,3),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_pl_lines_list ON price_list_lines (price_list_id);
CREATE INDEX idx_pl_lines_product ON price_list_lines (product_id);
CREATE INDEX idx_pl_lines_variant ON price_list_lines (variant_id) WHERE variant_id IS NOT NULL;
CREATE UNIQUE INDEX idx_pl_lines_unique
    ON price_list_lines (price_list_id, product_id, coalesce(variant_id, '00000000-0000-0000-0000-000000000000'), min_qty);
