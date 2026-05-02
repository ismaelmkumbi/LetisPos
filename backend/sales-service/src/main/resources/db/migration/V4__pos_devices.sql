-- Sales Service V4 — POS Hardware abstraction
--
-- Tracks the registered POS terminals and the customer-display screens that
-- subscribe to live cart updates. The customer display is a passive screen
-- (tablet/monitor) paired to a terminal; it consumes server-sent events
-- broadcast by the cashier's POS UI.
--
-- Scanner & scale are *client-side* devices — the browser/POS app reads them
-- via WebUSB/WebHID and sends the parsed values to the existing endpoints
-- (POST /pos/sales, GET /products/by-barcode/{code}, …). No server tables
-- required for those.

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE pos_terminals (
    id              UUID         PRIMARY KEY,
    name            VARCHAR(120) NOT NULL,
    code            VARCHAR(50)  NOT NULL,                    -- short-code shown on the till
    warehouse_id    UUID         NOT NULL,
    pairing_token   CHAR(12)     NOT NULL,                    -- 12-char code shown on the customer display when pairing
    cashier_user_id UUID,                                     -- last user who logged in here (advisory)
    is_active       BOOLEAN      NOT NULL DEFAULT TRUE,
    last_seen_at    TIMESTAMPTZ,
    notes           TEXT,
    tenant_id       UUID,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ  NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX idx_pos_terminals_tenant_code ON pos_terminals (tenant_id, lower(code));
CREATE UNIQUE INDEX idx_pos_terminals_pairing     ON pos_terminals (pairing_token);
CREATE INDEX idx_pos_terminals_warehouse ON pos_terminals (warehouse_id);
