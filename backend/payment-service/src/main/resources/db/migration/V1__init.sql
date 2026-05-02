-- Payment Service — initial schema.
-- Accounts (cash/bank/card) + payments + double-entry ledger + expenses/deposits
-- + Stripe webhook idempotency + outbox.

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==================================================================
-- ACCOUNTS (cash/bank/card)
-- ==================================================================
CREATE TABLE accounts (
    id              UUID          PRIMARY KEY,
    name            VARCHAR(120)  NOT NULL,
    number          VARCHAR(64),
    type            VARCHAR(20)   NOT NULL DEFAULT 'CASH',  -- CASH | BANK | CARD | MOBILE_MONEY
    currency        CHAR(3)       NOT NULL DEFAULT 'TZS',
    initial_balance NUMERIC(19,4) NOT NULL DEFAULT 0,
    balance         NUMERIC(19,4) NOT NULL DEFAULT 0,
    is_active       BOOLEAN       NOT NULL DEFAULT TRUE,
    notes           TEXT,
    tenant_id       UUID,
    created_at      TIMESTAMPTZ   NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ   NOT NULL DEFAULT now(),
    version         BIGINT        NOT NULL DEFAULT 0,
    CONSTRAINT accounts_type_chk CHECK (type IN ('CASH','BANK','CARD','MOBILE_MONEY'))
);
CREATE UNIQUE INDEX idx_accounts_tenant_name ON accounts (tenant_id, lower(name));

-- ==================================================================
-- PAYMENTS — attached to Sales / Purchases / Returns
-- ==================================================================
CREATE TABLE payments (
    id              UUID          PRIMARY KEY,
    ref             VARCHAR(50)   NOT NULL,
    date            DATE          NOT NULL DEFAULT CURRENT_DATE,
    reference_type  VARCHAR(30)   NOT NULL,     -- SALE | PURCHASE | SALE_RETURN | PURCHASE_RETURN
    reference_id    UUID          NOT NULL,
    account_id      UUID          NOT NULL REFERENCES accounts(id),
    amount          NUMERIC(19,4) NOT NULL CHECK (amount > 0),
    currency        CHAR(3)       NOT NULL DEFAULT 'TZS',
    method          VARCHAR(30)   NOT NULL,     -- CASH | CARD | CHECK | TRANSFER | MPESA | STRIPE
    external_ref    VARCHAR(100),               -- stripe charge id, m-pesa ref, cheque no, etc.
    notes           TEXT,
    status          VARCHAR(20)   NOT NULL DEFAULT 'COMPLETED',  -- PENDING | COMPLETED | FAILED | REFUNDED
    user_id         UUID,
    tenant_id       UUID,
    created_at      TIMESTAMPTZ   NOT NULL DEFAULT now(),
    CONSTRAINT payments_reference_type_chk CHECK (reference_type IN ('SALE','PURCHASE','SALE_RETURN','PURCHASE_RETURN')),
    CONSTRAINT payments_method_chk CHECK (method IN ('CASH','CARD','CHECK','TRANSFER','MPESA','STRIPE')),
    CONSTRAINT payments_status_chk CHECK (status IN ('PENDING','COMPLETED','FAILED','REFUNDED'))
);
CREATE UNIQUE INDEX idx_payments_tenant_ref ON payments (tenant_id, ref);
CREATE INDEX idx_payments_reference ON payments (reference_type, reference_id);
CREATE INDEX idx_payments_account   ON payments (account_id, date DESC);
CREATE INDEX idx_payments_date      ON payments (date DESC);

-- ==================================================================
-- ACCOUNT LEDGER — append-only, double-entry
--   debit  = money IN (asset increase on a cash account)
--   credit = money OUT
--   balance_after is the account balance after this row is posted.
-- ==================================================================
CREATE TABLE account_ledger (
    id             UUID          PRIMARY KEY,
    account_id     UUID          NOT NULL REFERENCES accounts(id),
    txn_date       DATE          NOT NULL DEFAULT CURRENT_DATE,
    reference_type VARCHAR(30),                          -- SALE | PURCHASE | ... | EXPENSE | DEPOSIT | TRANSFER
    reference_id   UUID,
    description    VARCHAR(255),
    debit          NUMERIC(19,4) NOT NULL DEFAULT 0 CHECK (debit  >= 0),
    credit         NUMERIC(19,4) NOT NULL DEFAULT 0 CHECK (credit >= 0),
    balance_after  NUMERIC(19,4) NOT NULL,
    tenant_id      UUID,
    created_at     TIMESTAMPTZ   NOT NULL DEFAULT now(),
    CONSTRAINT ledger_dr_xor_cr CHECK ((debit > 0) <> (credit > 0) OR (debit = 0 AND credit = 0))
);
CREATE INDEX idx_ledger_account_time ON account_ledger (account_id, txn_date DESC, created_at DESC);
CREATE INDEX idx_ledger_reference    ON account_ledger (reference_type, reference_id);
CREATE INDEX idx_ledger_created_brin ON account_ledger USING brin (created_at);

-- ==================================================================
-- EXPENSES + CATEGORIES
-- ==================================================================
CREATE TABLE expense_categories (
    id          UUID        PRIMARY KEY,
    name        VARCHAR(120) NOT NULL,
    description TEXT,
    tenant_id   UUID,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX idx_expcat_tenant_name ON expense_categories (tenant_id, lower(name));

CREATE TABLE expenses (
    id          UUID          PRIMARY KEY,
    ref         VARCHAR(50)   NOT NULL,
    date        DATE          NOT NULL DEFAULT CURRENT_DATE,
    account_id  UUID          NOT NULL REFERENCES accounts(id),
    category_id UUID          REFERENCES expense_categories(id) ON DELETE SET NULL,
    amount      NUMERIC(19,4) NOT NULL CHECK (amount > 0),
    currency    CHAR(3)       NOT NULL DEFAULT 'TZS',
    description TEXT,
    notes       TEXT,
    user_id     UUID,
    tenant_id   UUID,
    created_at  TIMESTAMPTZ   NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX idx_expenses_tenant_ref ON expenses (tenant_id, ref);
CREATE INDEX idx_expenses_account  ON expenses (account_id, date DESC);
CREATE INDEX idx_expenses_category ON expenses (category_id);

-- ==================================================================
-- DEPOSITS + CATEGORIES  (non-sale income: capital, refunds from staff, etc.)
-- ==================================================================
CREATE TABLE deposit_categories (
    id          UUID        PRIMARY KEY,
    name        VARCHAR(120) NOT NULL,
    description TEXT,
    tenant_id   UUID,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX idx_depcat_tenant_name ON deposit_categories (tenant_id, lower(name));

CREATE TABLE deposits (
    id          UUID          PRIMARY KEY,
    ref         VARCHAR(50)   NOT NULL,
    date        DATE          NOT NULL DEFAULT CURRENT_DATE,
    account_id  UUID          NOT NULL REFERENCES accounts(id),
    category_id UUID          REFERENCES deposit_categories(id) ON DELETE SET NULL,
    amount      NUMERIC(19,4) NOT NULL CHECK (amount > 0),
    currency    CHAR(3)       NOT NULL DEFAULT 'TZS',
    description TEXT,
    notes       TEXT,
    user_id     UUID,
    tenant_id   UUID,
    created_at  TIMESTAMPTZ   NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX idx_deposits_tenant_ref ON deposits (tenant_id, ref);

-- ==================================================================
-- ACCOUNT-TO-ACCOUNT TRANSFERS
-- ==================================================================
CREATE TABLE account_transfers (
    id               UUID          PRIMARY KEY,
    ref              VARCHAR(50)   NOT NULL,
    date             DATE          NOT NULL DEFAULT CURRENT_DATE,
    from_account_id  UUID          NOT NULL REFERENCES accounts(id),
    to_account_id    UUID          NOT NULL REFERENCES accounts(id),
    amount           NUMERIC(19,4) NOT NULL CHECK (amount > 0),
    notes            TEXT,
    user_id          UUID,
    tenant_id        UUID,
    created_at       TIMESTAMPTZ   NOT NULL DEFAULT now(),
    CONSTRAINT account_transfers_diff CHECK (from_account_id <> to_account_id)
);
CREATE UNIQUE INDEX idx_account_transfers_tenant_ref ON account_transfers (tenant_id, ref);

-- ==================================================================
-- STRIPE WEBHOOK IDEMPOTENCY
-- ==================================================================
CREATE TABLE stripe_events (
    id                UUID        PRIMARY KEY,
    stripe_event_id   VARCHAR(100) NOT NULL UNIQUE,
    type              VARCHAR(120) NOT NULL,
    payload           JSONB       NOT NULL,
    processed_at      TIMESTAMPTZ,
    processing_error  TEXT,
    received_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_stripe_events_unprocessed ON stripe_events (received_at) WHERE processed_at IS NULL;

-- ==================================================================
-- OUTBOX
-- ==================================================================
CREATE TABLE outbox (
    id             UUID        PRIMARY KEY,
    aggregate_type VARCHAR(50) NOT NULL,
    aggregate_id   UUID        NOT NULL,
    event_type     VARCHAR(80) NOT NULL,
    payload        JSONB       NOT NULL,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    published_at   TIMESTAMPTZ
);
CREATE INDEX idx_outbox_unpublished ON outbox (created_at) WHERE published_at IS NULL;
