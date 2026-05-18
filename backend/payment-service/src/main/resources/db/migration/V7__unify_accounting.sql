-- Payment Service V7 — Unify Accounting Systems
--
-- Bridges the operational account system (accounts/account_ledger) with the
-- General Ledger (chart_of_accounts/journal_entries/journal_entry_lines).
--
-- 1. Adds coa_id FK to accounts, expense_categories, deposit_categories
-- 2. Creates auto_posting_rules table that maps ReferenceType → COA counter-entry
-- 3. Fixes parent_id hierarchy on V2 seed data
-- 4. Adds expanded COA entries for a complete SME chart of accounts
-- 5. Seeds default auto-posting rules (global, tenant_id=NULL)

-- ==================================================================
-- 1. LINK OPERATIONAL ACCOUNTS TO CHART OF ACCOUNTS
-- ==================================================================
ALTER TABLE accounts ADD COLUMN coa_id UUID REFERENCES chart_of_accounts(id);
CREATE INDEX idx_accounts_coa ON accounts (coa_id);

-- ==================================================================
-- 2. LINK EXPENSE CATEGORIES TO COA
-- ==================================================================
ALTER TABLE expense_categories ADD COLUMN coa_id UUID REFERENCES chart_of_accounts(id);

-- ==================================================================
-- 3. LINK DEPOSIT CATEGORIES TO COA
-- ==================================================================
ALTER TABLE deposit_categories ADD COLUMN coa_id UUID REFERENCES chart_of_accounts(id);

-- ==================================================================
-- 4. AUTO POSTING RULES — maps ReferenceType → COA counter-entry
-- ==================================================================
CREATE TABLE auto_posting_rules (
    id              UUID          PRIMARY KEY,
    tenant_id       UUID,
    reference_type  VARCHAR(30)   NOT NULL,
    coa_id          UUID          NOT NULL REFERENCES chart_of_accounts(id),
    created_at      TIMESTAMPTZ   NOT NULL DEFAULT now(),
    CONSTRAINT apr_unique_rule UNIQUE (tenant_id, reference_type)
);
CREATE INDEX idx_apr_tenant ON auto_posting_rules (tenant_id);

-- ==================================================================
-- 5. FIX PARENT_ID HIERARCHY ON V2 SEED DATA
--    V2 used uuid_generate_v4() so we match by code.
-- ==================================================================
UPDATE chart_of_accounts c SET parent_id = p.id
FROM chart_of_accounts p
WHERE p.code = '1000' AND c.code IN ('1100','1110','1200','1300');

UPDATE chart_of_accounts c SET parent_id = p.id
FROM chart_of_accounts p
WHERE p.code = '2000' AND c.code IN ('2100','2200');

UPDATE chart_of_accounts c SET parent_id = p.id
FROM chart_of_accounts p
WHERE p.code = '3000' AND c.code IN ('3100','3200');

UPDATE chart_of_accounts c SET parent_id = p.id
FROM chart_of_accounts p
WHERE p.code = '4000' AND c.code IN ('4100','4200');

UPDATE chart_of_accounts c SET parent_id = p.id
FROM chart_of_accounts p
WHERE p.code = '5000' AND c.code IN ('5100','5200','5300','5400');

-- ==================================================================
-- 6. EXPANDED CHART OF ACCOUNTS — new leaf and group nodes
--    All new entries use uuid_generate_v4() with parent_id set via
--    code-based subqueries so they wire into the existing tree.
-- ==================================================================

-- ---- ASSETS (1000) ----

-- 1120 Mobile Money (child of 1000 Assets) — covers M-Pesa, Tigo Pesa, Airtel Money, etc.
INSERT INTO chart_of_accounts (id, parent_id, code, name, account_class, normal_balance, is_postable)
SELECT uuid_generate_v4(), p.id, '1120', 'Mobile Money', 'ASSET', 'DR', TRUE
FROM chart_of_accounts p WHERE p.code = '1000';

-- 1400 Prepaid Expenses (child of 1000 Assets) — OPTIONAL, inactive by default
INSERT INTO chart_of_accounts (id, parent_id, code, name, account_class, normal_balance, is_postable, is_active)
SELECT uuid_generate_v4(), p.id, '1400', 'Prepaid Expenses', 'ASSET', 'DR', TRUE, FALSE
FROM chart_of_accounts p WHERE p.code = '1000';

-- 1500 Fixed Assets (group, child of 1000 Assets) — OPTIONAL
INSERT INTO chart_of_accounts (id, parent_id, code, name, account_class, normal_balance, is_postable, is_active)
SELECT uuid_generate_v4(), p.id, '1500', 'Fixed Assets', 'ASSET', 'DR', FALSE, FALSE
FROM chart_of_accounts p WHERE p.code = '1000';

-- 1510 Accumulated Depreciation (child of 1500 Fixed Assets, contra-asset) — OPTIONAL
INSERT INTO chart_of_accounts (id, parent_id, code, name, account_class, normal_balance, is_postable, is_active)
SELECT uuid_generate_v4(), p.id, '1510', 'Accumulated Depreciation', 'ASSET', 'CR', TRUE, FALSE
FROM chart_of_accounts p WHERE p.code = '1500';

-- 1600 Other Current Assets (child of 1000 Assets) — OPTIONAL
INSERT INTO chart_of_accounts (id, parent_id, code, name, account_class, normal_balance, is_postable, is_active)
SELECT uuid_generate_v4(), p.id, '1600', 'Other Current Assets', 'ASSET', 'DR', TRUE, FALSE
FROM chart_of_accounts p WHERE p.code = '1000';

-- ---- LIABILITIES (2000) ----

-- 2300 Accrued Expenses (child of 2000 Liabilities) — OPTIONAL
INSERT INTO chart_of_accounts (id, parent_id, code, name, account_class, normal_balance, is_postable, is_active)
SELECT uuid_generate_v4(), p.id, '2300', 'Accrued Expenses', 'LIABILITY', 'CR', TRUE, FALSE
FROM chart_of_accounts p WHERE p.code = '2000';

-- 2400 Loans Payable (child of 2000 Liabilities) — OPTIONAL
INSERT INTO chart_of_accounts (id, parent_id, code, name, account_class, normal_balance, is_postable, is_active)
SELECT uuid_generate_v4(), p.id, '2400', 'Loans Payable', 'LIABILITY', 'CR', TRUE, FALSE
FROM chart_of_accounts p WHERE p.code = '2000';

-- 2500 Unearned Revenue (child of 2000 Liabilities) — OPTIONAL
INSERT INTO chart_of_accounts (id, parent_id, code, name, account_class, normal_balance, is_postable, is_active)
SELECT uuid_generate_v4(), p.id, '2500', 'Unearned Revenue', 'LIABILITY', 'CR', TRUE, FALSE
FROM chart_of_accounts p WHERE p.code = '2000';

-- ---- EQUITY (3000) ----

-- 3300 Owner's Drawings (child of 3000 Equity, contra-equity) — OPTIONAL
INSERT INTO chart_of_accounts (id, parent_id, code, name, account_class, normal_balance, is_postable, is_active)
SELECT uuid_generate_v4(), p.id, '3300', 'Owner''s Drawings', 'EQUITY', 'DR', TRUE, FALSE
FROM chart_of_accounts p WHERE p.code = '3000';

-- ---- REVENUE (4000) ----

-- 4300 Other Income (child of 4000 Revenue) — OPTIONAL
INSERT INTO chart_of_accounts (id, parent_id, code, name, account_class, normal_balance, is_postable, is_active)
SELECT uuid_generate_v4(), p.id, '4300', 'Other Income', 'REVENUE', 'CR', TRUE, FALSE
FROM chart_of_accounts p WHERE p.code = '4000';

-- 4400 Sales Discounts (child of 4000 Revenue, contra-revenue) — OPTIONAL
INSERT INTO chart_of_accounts (id, parent_id, code, name, account_class, normal_balance, is_postable, is_active)
SELECT uuid_generate_v4(), p.id, '4400', 'Sales Discounts', 'REVENUE', 'DR', TRUE, FALSE
FROM chart_of_accounts p WHERE p.code = '4000';

-- ---- EXPENSES (5000) ----

-- 5500 Office Supplies (child of 5000 Expenses) — OPTIONAL
INSERT INTO chart_of_accounts (id, parent_id, code, name, account_class, normal_balance, is_postable, is_active)
SELECT uuid_generate_v4(), p.id, '5500', 'Office Supplies', 'EXPENSE', 'DR', TRUE, FALSE
FROM chart_of_accounts p WHERE p.code = '5000';

-- 5600 Marketing & Advertising (child of 5000 Expenses) — OPTIONAL
INSERT INTO chart_of_accounts (id, parent_id, code, name, account_class, normal_balance, is_postable, is_active)
SELECT uuid_generate_v4(), p.id, '5600', 'Marketing & Advertising', 'EXPENSE', 'DR', TRUE, FALSE
FROM chart_of_accounts p WHERE p.code = '5000';

-- 5700 Transport & Logistics (child of 5000 Expenses) — OPTIONAL
INSERT INTO chart_of_accounts (id, parent_id, code, name, account_class, normal_balance, is_postable, is_active)
SELECT uuid_generate_v4(), p.id, '5700', 'Transport & Logistics', 'EXPENSE', 'DR', TRUE, FALSE
FROM chart_of_accounts p WHERE p.code = '5000';

-- 5800 Repairs & Maintenance (child of 5000 Expenses) — OPTIONAL
INSERT INTO chart_of_accounts (id, parent_id, code, name, account_class, normal_balance, is_postable, is_active)
SELECT uuid_generate_v4(), p.id, '5800', 'Repairs & Maintenance', 'EXPENSE', 'DR', TRUE, FALSE
FROM chart_of_accounts p WHERE p.code = '5000';

-- 5900 Depreciation Expense (child of 5000 Expenses) — OPTIONAL
INSERT INTO chart_of_accounts (id, parent_id, code, name, account_class, normal_balance, is_postable, is_active)
SELECT uuid_generate_v4(), p.id, '5900', 'Depreciation Expense', 'EXPENSE', 'DR', TRUE, FALSE
FROM chart_of_accounts p WHERE p.code = '5000';

-- 6000 Interest Expense (child of 5000 Expenses) — OPTIONAL
INSERT INTO chart_of_accounts (id, parent_id, code, name, account_class, normal_balance, is_postable, is_active)
SELECT uuid_generate_v4(), p.id, '6000', 'Interest Expense', 'EXPENSE', 'DR', TRUE, FALSE
FROM chart_of_accounts p WHERE p.code = '5000';

-- 6100 Tax Expense (child of 5000 Expenses) — OPTIONAL
INSERT INTO chart_of_accounts (id, parent_id, code, name, account_class, normal_balance, is_postable, is_active)
SELECT uuid_generate_v4(), p.id, '6100', 'Tax Expense', 'EXPENSE', 'DR', TRUE, FALSE
FROM chart_of_accounts p WHERE p.code = '5000';

-- 6200 Miscellaneous Expense (child of 5000 Expenses) — OPTIONAL
INSERT INTO chart_of_accounts (id, parent_id, code, name, account_class, normal_balance, is_postable, is_active)
SELECT uuid_generate_v4(), p.id, '6200', 'Miscellaneous Expense', 'EXPENSE', 'DR', TRUE, FALSE
FROM chart_of_accounts p WHERE p.code = '5000';

-- ==================================================================
-- 7. SEED DEFAULT AUTO POSTING RULES (global, tenant_id=NULL)
--    References COA entries by code for deterministic lookups.
-- ==================================================================
INSERT INTO auto_posting_rules (id, tenant_id, reference_type, coa_id)
SELECT uuid_generate_v4(), NULL::uuid, 'SALE',            c.id FROM chart_of_accounts c WHERE c.code = '4100' AND c.tenant_id IS NULL
UNION ALL
SELECT uuid_generate_v4(), NULL::uuid, 'PURCHASE',        c.id FROM chart_of_accounts c WHERE c.code = '5100' AND c.tenant_id IS NULL
UNION ALL
SELECT uuid_generate_v4(), NULL::uuid, 'SALE_RETURN',     c.id FROM chart_of_accounts c WHERE c.code = '4400' AND c.tenant_id IS NULL
UNION ALL
SELECT uuid_generate_v4(), NULL::uuid, 'PURCHASE_RETURN', c.id FROM chart_of_accounts c WHERE c.code = '5100' AND c.tenant_id IS NULL;
