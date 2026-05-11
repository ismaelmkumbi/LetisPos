-- V7: Gift Cards
-- Prepaid stored-value cards that can be issued and redeemed at POS.

CREATE TABLE gift_cards (
    id               UUID           PRIMARY KEY,
    card_number      VARCHAR(50)    NOT NULL UNIQUE,
    initial_balance  NUMERIC(19,4)  NOT NULL DEFAULT 0 CHECK (initial_balance >= 0),
    current_balance  NUMERIC(19,4)  NOT NULL DEFAULT 0 CHECK (current_balance >= 0),
    expiry_date      DATE,
    status           VARCHAR(20)    NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE','REDEEMED','EXPIRED')),
    customer_id      UUID           REFERENCES customers(id) ON DELETE SET NULL,
    purchased_by     UUID,
    tenant_id        UUID,
    created_at       TIMESTAMPTZ    NOT NULL DEFAULT now(),
    updated_at       TIMESTAMPTZ    NOT NULL DEFAULT now()
);
CREATE INDEX idx_gift_cards_tenant ON gift_cards (tenant_id);
CREATE INDEX idx_gift_cards_customer ON gift_cards (customer_id);
CREATE INDEX idx_gift_cards_status ON gift_cards (status);
