CREATE TABLE custom_domains (
    id              UUID PRIMARY KEY,
    tenant_id       UUID NOT NULL,
    store_id        UUID NOT NULL REFERENCES stores(id),
    domain          VARCHAR(255) NOT NULL UNIQUE,
    is_verified     BOOLEAN NOT NULL DEFAULT false,
    verification_code VARCHAR(64),
    ssl_status      VARCHAR(20) NOT NULL DEFAULT 'pending',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    version         BIGINT NOT NULL DEFAULT 0
);
