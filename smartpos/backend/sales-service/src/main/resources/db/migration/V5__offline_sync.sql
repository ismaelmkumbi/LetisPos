-- Sales Service V5 — Offline-first POS support
--
-- Two new mechanisms:
--   1. offline_batches: a batch of POS sales captured while a terminal was
--      offline. The cashier UI POSTs them as a single payload when connectivity
--      returns; the server processes them and stores per-row results.
--      Idempotency is guaranteed by (terminal_id, client_op_id) so the same
--      offline-batch can be re-sent safely if the upload itself fails halfway.
--   2. offline_op_ids: tracks the per-row client_op_id seen so far → if a
--      duplicate ID arrives, we return the cached server-side sale id without
--      processing again. This is what makes the upload safely retryable.

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE offline_batches (
    id              UUID         PRIMARY KEY,
    terminal_id     UUID         NOT NULL,
    client_batch_id VARCHAR(80)  NOT NULL,                  -- supplied by client; uuid or ULID
    status          VARCHAR(16)  NOT NULL DEFAULT 'PENDING', -- PENDING | PROCESSED | FAILED
    item_count      INT          NOT NULL DEFAULT 0,
    success_count   INT          NOT NULL DEFAULT 0,
    error_count     INT          NOT NULL DEFAULT 0,
    payload         JSONB        NOT NULL,
    response        JSONB,
    error_message   TEXT,
    tenant_id       UUID,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT now(),
    completed_at    TIMESTAMPTZ,
    CONSTRAINT  offline_batches_status_chk CHECK (status IN ('PENDING','PROCESSED','FAILED'))
);
CREATE UNIQUE INDEX idx_offline_batches_terminal_client
    ON offline_batches (terminal_id, client_batch_id);

-- Per-row idempotency: a client-generated op id maps to the eventually
-- created sale id. Reusing the same op id returns the existing sale id.
CREATE TABLE offline_op_ids (
    id              UUID         PRIMARY KEY,
    terminal_id     UUID         NOT NULL,
    client_op_id    VARCHAR(80)  NOT NULL,
    sale_id         UUID,
    status          VARCHAR(16)  NOT NULL DEFAULT 'OK',     -- OK | FAILED
    error           TEXT,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX idx_offline_op_ids_unique ON offline_op_ids (terminal_id, client_op_id);
