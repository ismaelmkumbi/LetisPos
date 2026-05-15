CREATE TABLE assistant_drafts (
    id          UUID PRIMARY KEY,
    user_id     UUID NOT NULL,
    tenant_id   UUID NOT NULL,
    tool_name   VARCHAR(128) NOT NULL,
    tool_input  JSONB NOT NULL,
    summary     VARCHAR(512) NOT NULL,
    status      VARCHAR(16) NOT NULL DEFAULT 'PENDING',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    expires_at  TIMESTAMPTZ NOT NULL
);

CREATE INDEX idx_assistant_drafts_user ON assistant_drafts(user_id);
