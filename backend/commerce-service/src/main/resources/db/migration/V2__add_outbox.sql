CREATE TABLE IF NOT EXISTS outbox (
    id             UUID        PRIMARY KEY,
    aggregate_type VARCHAR(50) NOT NULL,
    aggregate_id   UUID        NOT NULL,
    event_type     VARCHAR(80) NOT NULL,
    payload        JSONB       NOT NULL,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    published_at   TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_outbox_unpublished ON outbox (created_at) WHERE published_at IS NULL;
