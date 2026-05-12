CREATE TABLE shipping_zones (
    id              UUID PRIMARY KEY,
    tenant_id       UUID NOT NULL,
    store_id        UUID NOT NULL REFERENCES stores(id),
    name            VARCHAR(255) NOT NULL,
    countries       TEXT[] NOT NULL,
    regions         TEXT[],
    rates           JSONB NOT NULL DEFAULT '[]',
    is_active       BOOLEAN NOT NULL DEFAULT true,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at      TIMESTAMPTZ,
    version         BIGINT NOT NULL DEFAULT 0
);
