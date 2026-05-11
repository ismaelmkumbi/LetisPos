CREATE TABLE payment_methods (
    id UUID PRIMARY KEY,
    tenant_id UUID NOT NULL,
    type VARCHAR(30) NOT NULL,       -- MPESA, TIGO_PESA, AIRTEL_MONEY, CARD, BANK_TRANSFER, CASH
    provider VARCHAR(50),             -- STRIPE, VODACOM, TIGO, AIRTEL
    label VARCHAR(100) NOT NULL,      -- "M-Pesa 0712 345 678", "Visa **** 4242"
    provider_customer_id VARCHAR(100), -- Stripe customer ID or mobile money wallet ID
    is_default BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
