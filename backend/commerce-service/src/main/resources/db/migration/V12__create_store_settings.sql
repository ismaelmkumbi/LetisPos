CREATE TABLE store_settings (
    id              UUID PRIMARY KEY,
    tenant_id       UUID NOT NULL,
    store_id        UUID NOT NULL UNIQUE REFERENCES stores(id),
    settings        JSONB NOT NULL DEFAULT '{}',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    version         BIGINT NOT NULL DEFAULT 0
);
