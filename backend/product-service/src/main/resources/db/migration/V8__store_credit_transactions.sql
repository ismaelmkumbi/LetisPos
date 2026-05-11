-- V8: Store Credit Transactions
-- Tracks customer store credit operations: returns, deposits, redemptions, adjustments.
-- Customer balance is computed as SUM(amount) for all transactions of a given customer.

CREATE TABLE store_credit_transactions (
    id          UUID           PRIMARY KEY,
    customer_id UUID           NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    amount      NUMERIC(19,4)  NOT NULL,
    type        VARCHAR(30)    NOT NULL CHECK (type IN ('RETURN_CREDIT','DEPOSIT','REDEMPTION','ADJUSTMENT')),
    reference   VARCHAR(100),
    notes       TEXT,
    tenant_id   UUID,
    created_at  TIMESTAMPTZ    NOT NULL DEFAULT now()
);
CREATE INDEX idx_store_credit_customer ON store_credit_transactions (customer_id);
CREATE INDEX idx_store_credit_tenant ON store_credit_transactions (tenant_id);
CREATE INDEX idx_store_credit_type ON store_credit_transactions (type);
