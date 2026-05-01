-- Phase 6c — payment-id idempotency for sales.
--
-- Two paths can call SaleService.applyPayment for the same payment:
--   1. Synchronous Feign callback from Payment Service's PaymentService.reconcileWithSales (existing).
--   2. Kafka PaymentReceived consumer (new in Phase 6c, eventually-consistent fallback when path 1 fails).
--
-- Without this table, both paths would double-bump paid_total. Insert keyed on
-- payment_id with a UNIQUE constraint — whichever path lands first wins; the
-- second is a silent no-op when the insert violates the constraint.
--
-- We don't need an FK to a payments table (lives in payment-service's DB) — the
-- column is just a stable opaque ID treated as a write-once token.

CREATE TABLE sale_payments_applied (
    payment_id   UUID         PRIMARY KEY,
    sale_id      UUID         NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
    amount       NUMERIC(19,4) NOT NULL CHECK (amount >= 0),
    source       VARCHAR(20)  NOT NULL,                         -- 'FEIGN' | 'KAFKA'
    applied_at   TIMESTAMPTZ  NOT NULL DEFAULT now(),
    CONSTRAINT sale_payments_applied_source_chk CHECK (source IN ('FEIGN','KAFKA'))
);

CREATE INDEX idx_sale_payments_applied_sale ON sale_payments_applied (sale_id);
