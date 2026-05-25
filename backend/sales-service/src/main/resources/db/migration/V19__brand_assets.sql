CREATE TABLE IF NOT EXISTS brand_assets (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID        NOT NULL,
    name            VARCHAR(255) NOT NULL,
    category        VARCHAR(20) NOT NULL,
    format          VARCHAR(10) NOT NULL DEFAULT 'png',
    variant         VARCHAR(20) DEFAULT 'original',
    url             TEXT        NOT NULL,
    width           INT,
    height          INT,
    size_bytes      BIGINT,
    ai_generated    BOOLEAN     NOT NULL DEFAULT false,
    created_at      TIMESTAMP   NOT NULL DEFAULT now()
);
