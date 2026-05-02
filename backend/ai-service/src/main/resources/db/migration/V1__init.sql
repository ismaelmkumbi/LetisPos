-- AI Service — schema
-- Stores prompts/responses for audit and caches expensive insight runs.

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==================================================================
-- Conversation log — every prompt/response pair, for billing + audit.
-- ==================================================================
CREATE TABLE ai_invocations (
    id              UUID         PRIMARY KEY,
    kind            VARCHAR(40)  NOT NULL,                    -- SALES_TREND | NARRATE_REPORT | FORECAST | ANOMALY | CHAT
    provider        VARCHAR(20)  NOT NULL,                    -- anthropic | openai | stub
    model           VARCHAR(60)  NOT NULL,
    prompt_tokens   INT,
    completion_tokens INT,
    input_summary   TEXT,
    output          TEXT,
    error           TEXT,
    user_id         UUID,
    tenant_id       UUID,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT now(),
    duration_ms     INT,
    CONSTRAINT ai_invocations_kind_chk
        CHECK (kind IN ('SALES_TREND','NARRATE_REPORT','FORECAST','ANOMALY','CHAT'))
);
CREATE INDEX idx_ai_invocations_created ON ai_invocations (created_at DESC);
CREATE INDEX idx_ai_invocations_kind    ON ai_invocations (kind, created_at DESC);

-- ==================================================================
-- Insight cache — keyed by (kind, input_hash) to avoid re-paying for
-- identical questions; TTL'd by `expires_at`.
-- ==================================================================
CREATE TABLE ai_insight_cache (
    id          UUID         PRIMARY KEY,
    kind        VARCHAR(40)  NOT NULL,
    input_hash  CHAR(64)     NOT NULL,                         -- SHA-256
    output      TEXT         NOT NULL,
    metadata    JSONB,
    tenant_id   UUID,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT now(),
    expires_at  TIMESTAMPTZ  NOT NULL
);
CREATE UNIQUE INDEX idx_ai_cache_kind_hash ON ai_insight_cache (kind, input_hash, COALESCE(tenant_id, '00000000-0000-0000-0000-000000000000'));
CREATE INDEX idx_ai_cache_expires ON ai_insight_cache (expires_at);
