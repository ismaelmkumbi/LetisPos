-- Integration Service — schema
-- Tracks per-integration configuration + every sync attempt for audit + retry.

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Per-tenant integration toggle + credentials (overrides app config).
CREATE TABLE integration_configs (
    id          UUID         PRIMARY KEY,
    tenant_id   UUID,
    provider    VARCHAR(40)  NOT NULL,                    -- ZATCA | WOOCOMMERCE | QUICKBOOKS
    enabled     BOOLEAN      NOT NULL DEFAULT FALSE,
    config      JSONB        NOT NULL DEFAULT '{}',       -- per-provider keys (api keys, urls, …)
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ  NOT NULL DEFAULT now(),
    CONSTRAINT  integ_provider_chk CHECK (provider IN ('ZATCA','WOOCOMMERCE','QUICKBOOKS'))
);
CREATE UNIQUE INDEX idx_integ_tenant_provider ON integration_configs (tenant_id, provider);

-- Sync log — one row per outbound call (or batch).
CREATE TABLE integration_syncs (
    id              UUID         PRIMARY KEY,
    provider        VARCHAR(40)  NOT NULL,
    direction       VARCHAR(10)  NOT NULL,                -- IN | OUT
    entity_type     VARCHAR(40)  NOT NULL,                -- Sale | Product | Invoice | Customer | …
    entity_id       UUID,
    external_id     VARCHAR(100),                         -- id at the external system
    status          VARCHAR(16)  NOT NULL DEFAULT 'PENDING', -- PENDING | OK | FAILED
    attempts        INT          NOT NULL DEFAULT 0,
    request_body    TEXT,
    response_body   TEXT,
    error_message   TEXT,
    next_retry_at   TIMESTAMPTZ,
    tenant_id       UUID,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT now(),
    completed_at    TIMESTAMPTZ,
    CONSTRAINT      sync_status_chk CHECK (status IN ('PENDING','OK','FAILED')),
    CONSTRAINT      sync_dir_chk    CHECK (direction IN ('IN','OUT'))
);
CREATE INDEX idx_syncs_status_retry ON integration_syncs (status, next_retry_at);
CREATE INDEX idx_syncs_entity ON integration_syncs (entity_type, entity_id);
CREATE INDEX idx_syncs_provider_created ON integration_syncs (provider, created_at DESC);
