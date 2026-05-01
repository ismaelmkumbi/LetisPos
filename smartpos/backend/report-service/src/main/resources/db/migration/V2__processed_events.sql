-- Idempotency log for Kafka consumers.
-- Every incoming event's eventId (outbox row id) is inserted here once it's
-- successfully projected. Redelivery finds an existing row and skips.

CREATE TABLE processed_events (
    event_id       UUID         PRIMARY KEY,
    event_type     VARCHAR(80)  NOT NULL,
    aggregate_type VARCHAR(50)  NOT NULL,
    processed_at   TIMESTAMPTZ  NOT NULL DEFAULT now()
);
CREATE INDEX idx_processed_events_at ON processed_events (processed_at DESC);
