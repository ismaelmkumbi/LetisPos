-- Payment-id idempotency for purchases.
--
-- Purchase payments can be reconciled more than once when a synchronous Feign
-- callback is retried or later backed by Kafka. The payment_id primary key
-- makes repeated delivery of the same Payment Service record a no-op.

CREATE TABLE purchase_payments_applied (
    payment_id    UUID          PRIMARY KEY,
    purchase_id   UUID          NOT NULL REFERENCES purchases(id) ON DELETE CASCADE,
    amount        NUMERIC(19,4) NOT NULL CHECK (amount >= 0),
    source        VARCHAR(20)   NOT NULL,
    applied_at    TIMESTAMPTZ   NOT NULL DEFAULT now(),
    CONSTRAINT purchase_payments_applied_source_chk CHECK (source IN ('FEIGN','KAFKA'))
);

CREATE INDEX idx_purchase_payments_applied_purchase ON purchase_payments_applied (purchase_id);
