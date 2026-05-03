-- V6__cash_register_sessions.sql
-- Tracks cash register open/close sessions per warehouse.

CREATE TABLE cash_register_sessions (
    id              UUID PRIMARY KEY,
    warehouse_id    UUID         NOT NULL,
    user_id         UUID         NOT NULL,
    opened_at       TIMESTAMPTZ  NOT NULL DEFAULT now(),
    closed_at       TIMESTAMPTZ,
    opening_balance NUMERIC(19,4) NOT NULL DEFAULT 0,
    counted_cash    NUMERIC(19,4),
    expected_cash   NUMERIC(19,4) NOT NULL DEFAULT 0,
    status          VARCHAR(10)  NOT NULL DEFAULT 'OPEN',
    notes           TEXT,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ  NOT NULL DEFAULT now(),
    version         BIGINT       NOT NULL DEFAULT 0,

    CONSTRAINT cash_register_sessions_status_chk CHECK (status IN ('OPEN', 'CLOSED'))
);

CREATE INDEX idx_cash_register_warehouse_status
    ON cash_register_sessions (warehouse_id, status);
