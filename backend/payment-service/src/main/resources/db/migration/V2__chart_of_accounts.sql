-- Payment Service V2 — General Ledger
--
-- Adds a hierarchical Chart of Accounts plus a proper journal
-- (header + lines, double-entry, must balance) on top of the
-- per-cash-account `account_ledger` from V1. The two coexist:
--   - account_ledger:  cashflow / per-account running balance (operational)
--   - journal_entries: GL postings used for Trial Balance / P&L / Balance Sheet
--
-- Posting flow: a JournalEntry is DRAFT until `posted_at` is set; only
-- POSTED entries roll up into financial statements.

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==================================================================
-- CHART OF ACCOUNTS
-- ==================================================================
CREATE TABLE chart_of_accounts (
    id              UUID         PRIMARY KEY,
    parent_id       UUID         REFERENCES chart_of_accounts(id) ON DELETE SET NULL,
    code            VARCHAR(32)  NOT NULL,
    name            VARCHAR(150) NOT NULL,
    account_class   VARCHAR(20)  NOT NULL,                    -- ASSET | LIABILITY | EQUITY | REVENUE | EXPENSE
    -- Most accounts naturally carry a normal balance; we store it explicitly so
    -- contra-accounts (e.g. accumulated depreciation under ASSET, normal=CREDIT)
    -- can be modelled without a separate flag.
    normal_balance  CHAR(2)      NOT NULL,                    -- DR | CR
    is_postable     BOOLEAN      NOT NULL DEFAULT TRUE,       -- only leaf accounts accept postings
    is_active       BOOLEAN      NOT NULL DEFAULT TRUE,
    description     TEXT,
    tenant_id       UUID,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ  NOT NULL DEFAULT now(),
    CONSTRAINT coa_class_chk   CHECK (account_class IN ('ASSET','LIABILITY','EQUITY','REVENUE','EXPENSE')),
    CONSTRAINT coa_normal_chk  CHECK (normal_balance IN ('DR','CR'))
);
CREATE UNIQUE INDEX idx_coa_tenant_code ON chart_of_accounts (tenant_id, lower(code));
CREATE INDEX idx_coa_parent ON chart_of_accounts (parent_id);
CREATE INDEX idx_coa_class  ON chart_of_accounts (account_class);

-- ==================================================================
-- JOURNAL ENTRIES (header + lines)
-- ==================================================================
CREATE TABLE journal_entries (
    id              UUID         PRIMARY KEY,
    ref             VARCHAR(50)  NOT NULL,
    entry_date      DATE         NOT NULL DEFAULT CURRENT_DATE,
    memo            VARCHAR(255),
    source          VARCHAR(40)  NOT NULL DEFAULT 'MANUAL',   -- MANUAL | SALE | PURCHASE | EXPENSE | PAYROLL | ADJUSTMENT | OPENING
    source_ref      VARCHAR(80),                              -- foreign reference (sale id, purchase id, …)
    status          VARCHAR(16)  NOT NULL DEFAULT 'DRAFT',    -- DRAFT | POSTED | VOIDED
    posted_at       TIMESTAMPTZ,
    posted_by       UUID,
    voided_at       TIMESTAMPTZ,
    voided_by       UUID,
    void_reason     TEXT,
    tenant_id       UUID,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ  NOT NULL DEFAULT now(),
    version         BIGINT       NOT NULL DEFAULT 0,
    CONSTRAINT je_status_chk CHECK (status IN ('DRAFT','POSTED','VOIDED'))
);
CREATE UNIQUE INDEX idx_je_tenant_ref ON journal_entries (tenant_id, ref);
CREATE INDEX idx_je_date    ON journal_entries (entry_date DESC);
CREATE INDEX idx_je_status  ON journal_entries (status);
CREATE INDEX idx_je_source  ON journal_entries (source, source_ref);

CREATE TABLE journal_entry_lines (
    id                  UUID          PRIMARY KEY,
    journal_entry_id    UUID          NOT NULL REFERENCES journal_entries(id) ON DELETE CASCADE,
    account_id          UUID          NOT NULL REFERENCES chart_of_accounts(id),
    debit               NUMERIC(19,4) NOT NULL DEFAULT 0 CHECK (debit  >= 0),
    credit              NUMERIC(19,4) NOT NULL DEFAULT 0 CHECK (credit >= 0),
    memo                VARCHAR(255),
    position            INT           NOT NULL DEFAULT 0,
    -- Each line is either a DR or CR — never both (and never both zero).
    CONSTRAINT jel_dr_xor_cr CHECK ((debit > 0) <> (credit > 0))
);
CREATE INDEX idx_jel_journal ON journal_entry_lines (journal_entry_id);
CREATE INDEX idx_jel_account ON journal_entry_lines (account_id);

-- ==================================================================
-- Seed minimal Chart of Accounts (tenant-less = global default)
-- These match the buckets the Reports module needs to render P&L /
-- Balance Sheet on day-one.
-- ==================================================================
INSERT INTO chart_of_accounts (id, code, name, account_class, normal_balance, is_postable) VALUES
  -- ASSETS
  (uuid_generate_v4(), '1000', 'Assets',                    'ASSET',     'DR', FALSE),
  (uuid_generate_v4(), '1100', 'Cash on Hand',              'ASSET',     'DR', TRUE),
  (uuid_generate_v4(), '1110', 'Bank Accounts',             'ASSET',     'DR', TRUE),
  (uuid_generate_v4(), '1200', 'Accounts Receivable',       'ASSET',     'DR', TRUE),
  (uuid_generate_v4(), '1300', 'Inventory',                 'ASSET',     'DR', TRUE),
  -- LIABILITIES
  (uuid_generate_v4(), '2000', 'Liabilities',               'LIABILITY', 'CR', FALSE),
  (uuid_generate_v4(), '2100', 'Accounts Payable',          'LIABILITY', 'CR', TRUE),
  (uuid_generate_v4(), '2200', 'Sales Tax Payable',         'LIABILITY', 'CR', TRUE),
  -- EQUITY
  (uuid_generate_v4(), '3000', 'Equity',                    'EQUITY',    'CR', FALSE),
  (uuid_generate_v4(), '3100', 'Owner''s Capital',          'EQUITY',    'CR', TRUE),
  (uuid_generate_v4(), '3200', 'Retained Earnings',         'EQUITY',    'CR', TRUE),
  -- REVENUE
  (uuid_generate_v4(), '4000', 'Revenue',                   'REVENUE',   'CR', FALSE),
  (uuid_generate_v4(), '4100', 'Sales Revenue',             'REVENUE',   'CR', TRUE),
  (uuid_generate_v4(), '4200', 'Service Revenue',           'REVENUE',   'CR', TRUE),
  -- EXPENSES
  (uuid_generate_v4(), '5000', 'Expenses',                  'EXPENSE',   'DR', FALSE),
  (uuid_generate_v4(), '5100', 'Cost of Goods Sold',        'EXPENSE',   'DR', TRUE),
  (uuid_generate_v4(), '5200', 'Operating Expense',         'EXPENSE',   'DR', TRUE),
  (uuid_generate_v4(), '5300', 'Salaries & Wages',          'EXPENSE',   'DR', TRUE),
  (uuid_generate_v4(), '5400', 'Rent & Utilities',          'EXPENSE',   'DR', TRUE);
