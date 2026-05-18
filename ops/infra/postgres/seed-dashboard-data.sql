-- =============================================================================
-- Dashboard Seed Data — Realistic Tanzanian SME
-- Run: PGPASSWORD=smartpos psql -h localhost -p 5434 -U smartpos -d postgres -f ops/infra/postgres/seed-dashboard-data.sql
-- =============================================================================

-- Use "Default Workspace" tenant (exists in all dev DBs)
\set TENANT '382626bc-cff4-4843-b2f3-0ed99e5c23a6'
\set WAREHOUSE '1547dccb-7ca3-4083-a823-5330bcf43ecf'

-- =============================================================================
-- 1. PRODUCT DB
-- =============================================================================
\c product_db

INSERT INTO categories (id, name, code, tenant_id) VALUES
  ('a0000000-0000-0000-0000-000000000001', 'Groceries',     'GROC',  :'TENANT'),
  ('a0000000-0000-0000-0000-000000000002', 'Beverages',     'BEV',   :'TENANT'),
  ('a0000000-0000-0000-0000-000000000003', 'Household',     'HOUSE', :'TENANT'),
  ('a0000000-0000-0000-0000-000000000004', 'Dairy',         'DAIRY', :'TENANT'),
  ('a0000000-0000-0000-0000-000000000005', 'Construction',  'CONST', :'TENANT')
ON CONFLICT (id) DO NOTHING;

INSERT INTO products (id, code, name, category_id, cost, price, stock_alert, type, status, tenant_id) VALUES
  ('b0000000-0000-0000-0000-000000000001', 'SKU-001', 'Maize Flour (50kg)',  'a0000000-0000-0000-0000-000000000001', 42000, 48000, 10, 'STANDARD', true, :'TENANT'),
  ('b0000000-0000-0000-0000-000000000002', 'SKU-002', 'Cooking Oil (5L)',    'a0000000-0000-0000-0000-000000000001', 28000, 32000, 15, 'STANDARD', true, :'TENANT'),
  ('b0000000-0000-0000-0000-000000000003', 'SKU-003', 'Sugar (25kg)',        'a0000000-0000-0000-0000-000000000001', 38000, 45000, 8,  'STANDARD', true, :'TENANT'),
  ('b0000000-0000-0000-0000-000000000004', 'SKU-004', 'Rice (25kg)',         'a0000000-0000-0000-0000-000000000001', 35000, 40000, 10, 'STANDARD', true, :'TENANT'),
  ('b0000000-0000-0000-0000-000000000005', 'SKU-005', 'Milk (1L)',           'a0000000-0000-0000-0000-000000000004', 1800,  2500,  30, 'STANDARD', true, :'TENANT'),
  ('b0000000-0000-0000-0000-000000000006', 'SKU-006', 'Cement (50kg)',       'a0000000-0000-0000-0000-000000000005', 14000, 16000, 5,  'STANDARD', true, :'TENANT'),
  ('b0000000-0000-0000-0000-000000000007', 'SKU-007', 'Bar Soap (Box)',      'a0000000-0000-0000-0000-000000000003', 18000, 22000, 12, 'STANDARD', true, :'TENANT'),
  ('b0000000-0000-0000-0000-000000000008', 'SKU-008', 'Milk Powder (500g)',  'a0000000-0000-0000-0000-000000000004', 4500,  5500,  20, 'STANDARD', true, :'TENANT'),
  ('b0000000-0000-0000-0000-000000000009', 'SKU-009', 'Wheat Flour (10kg)',  'a0000000-0000-0000-0000-000000000001', 12000, 14000, 8,  'STANDARD', true, :'TENANT'),
  ('b0000000-0000-0000-0000-000000000010', 'SKU-010', 'Bottled Water (Case)','a0000000-0000-0000-0000-000000000002', 5000,  6000,  25, 'STANDARD', true, :'TENANT'),
  ('b0000000-0000-0000-0000-000000000011', 'SKU-011', 'Soap (Carton)',       'a0000000-0000-0000-0000-000000000003', 25000, 30000, 10, 'STANDARD', true, :'TENANT'),
  ('b0000000-0000-0000-0000-000000000012', 'SKU-012', 'Cooking Gas (15kg)',  'a0000000-0000-0000-0000-000000000003', 48000, 55000, 3,  'STANDARD', true, :'TENANT')
ON CONFLICT (id) DO NOTHING;

INSERT INTO customers (id, code, name, phone, email, is_active, tenant_id) VALUES
  ('c0000000-0000-0000-0000-000000000001', 'CUST-001', 'Jane Daudi',   '+255 712 111 001', 'jane@example.com',   true, :'TENANT'),
  ('c0000000-0000-0000-0000-000000000002', 'CUST-002', 'John Magesa',  '+255 712 111 002', 'john@example.com',   true, :'TENANT'),
  ('c0000000-0000-0000-0000-000000000003', 'CUST-003', 'Ali Khamis',   '+255 712 111 003', 'ali@example.com',    true, :'TENANT'),
  ('c0000000-0000-0000-0000-000000000004', 'CUST-004', 'Fatma Omar',   '+255 712 111 004', 'fatma@example.com',  true, :'TENANT'),
  ('c0000000-0000-0000-0000-000000000005', 'CUST-005', 'Grace Shayo',  '+255 712 111 005', 'grace@example.com',  true, :'TENANT'),
  ('c0000000-0000-0000-0000-000000000006', 'CUST-006', 'Peter Mushi',  '+255 712 111 006', 'peter@example.com',  true, :'TENANT'),
  ('c0000000-0000-0000-0000-000000000007', 'CUST-007', 'David Mwanga', '+255 712 111 007', 'david@example.com',  true, :'TENANT'),
  ('c0000000-0000-0000-0000-000000000008', 'CUST-008', 'Anna Juma',     '+255 712 111 008', 'anna@example.com',   true, :'TENANT'),
  ('c0000000-0000-0000-0000-000000000009', 'CUST-009', 'Walk-in Customer', NULL, NULL, true, :'TENANT')
ON CONFLICT (id) DO NOTHING;

INSERT INTO suppliers (id, code, name, phone, is_active, tenant_id) VALUES
  ('d0000000-0000-0000-0000-000000000001', 'SUPP-001', 'Tanzania Wholesale Ltd', '+255 713 200 001', true, :'TENANT'),
  ('d0000000-0000-0000-0000-000000000002', 'SUPP-002', 'Dar Commodities Co',     '+255 713 200 002', true, :'TENANT'),
  ('d0000000-0000-0000-0000-000000000003', 'SUPP-003', 'Mwenge Distributors',   '+255 713 200 003', true, :'TENANT'),
  ('d0000000-0000-0000-0000-000000000004', 'SUPP-004', 'East Africa Supplies',  '+255 713 200 004', true, :'TENANT'),
  ('d0000000-0000-0000-0000-000000000005', 'SUPP-005', 'Coast Traders Ltd',     '+255 713 200 005', true, :'TENANT')
ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- 2. INVENTORY DB
-- =============================================================================
\c inventory_db

INSERT INTO warehouses (id, code, name, city, country, phone, is_active, tenant_id) VALUES
  (:'WAREHOUSE', 'MAIN', 'Main Branch — Mwenge', 'Dar es Salaam', 'TZ', '+255 712 345 678', true, :'TENANT')
ON CONFLICT (id) DO NOTHING;

INSERT INTO stock_levels (id, product_id, warehouse_id, on_hand, reserved, stock_alert_threshold, tenant_id, version) VALUES
  (gen_random_uuid(), 'b0000000-0000-0000-0000-000000000001', :'WAREHOUSE', 2,   0, 10, :'TENANT', 0),
  (gen_random_uuid(), 'b0000000-0000-0000-0000-000000000002', :'WAREHOUSE', 25,  0, 15, :'TENANT', 0),
  (gen_random_uuid(), 'b0000000-0000-0000-0000-000000000003', :'WAREHOUSE', 4,   0, 8,  :'TENANT', 0),
  (gen_random_uuid(), 'b0000000-0000-0000-0000-000000000004', :'WAREHOUSE', 18,  0, 10, :'TENANT', 0),
  (gen_random_uuid(), 'b0000000-0000-0000-0000-000000000005', :'WAREHOUSE', 45,  0, 30, :'TENANT', 0),
  (gen_random_uuid(), 'b0000000-0000-0000-0000-000000000006', :'WAREHOUSE', 3,   0, 5,  :'TENANT', 0),
  (gen_random_uuid(), 'b0000000-0000-0000-0000-000000000007', :'WAREHOUSE', 22,  0, 12, :'TENANT', 0),
  (gen_random_uuid(), 'b0000000-0000-0000-0000-000000000008', :'WAREHOUSE', 35,  0, 20, :'TENANT', 0),
  (gen_random_uuid(), 'b0000000-0000-0000-0000-000000000009', :'WAREHOUSE', 5,   0, 8,  :'TENANT', 0),
  (gen_random_uuid(), 'b0000000-0000-0000-0000-000000000010', :'WAREHOUSE', 50,  0, 25, :'TENANT', 0),
  (gen_random_uuid(), 'b0000000-0000-0000-0000-000000000011', :'WAREHOUSE', 8,   0, 10, :'TENANT', 0),
  (gen_random_uuid(), 'b0000000-0000-0000-0000-000000000012', :'WAREHOUSE', 6,   0, 3,  :'TENANT', 0)
ON CONFLICT DO NOTHING;

-- Reorder rules (trigger reorder suggestions)
INSERT INTO reorder_rules (id, product_id, warehouse_id, min_qty, reorder_qty, supplier_id, active, tenant_id) VALUES
  (gen_random_uuid(), 'b0000000-0000-0000-0000-000000000001', :'WAREHOUSE', 10, 50, 'd0000000-0000-0000-0000-000000000001', true, :'TENANT'),
  (gen_random_uuid(), 'b0000000-0000-0000-0000-000000000003', :'WAREHOUSE', 8,  30, 'd0000000-0000-0000-0000-000000000001', true, :'TENANT'),
  (gen_random_uuid(), 'b0000000-0000-0000-0000-000000000009', :'WAREHOUSE', 8,  20, 'd0000000-0000-0000-0000-000000000002', true, :'TENANT'),
  (gen_random_uuid(), 'b0000000-0000-0000-0000-000000000006', :'WAREHOUSE', 5,  15, 'd0000000-0000-0000-0000-000000000004', true, :'TENANT'),
  (gen_random_uuid(), 'b0000000-0000-0000-0000-000000000011', :'WAREHOUSE', 10, 25, 'd0000000-0000-0000-0000-000000000003', true, :'TENANT')
ON CONFLICT DO NOTHING;

-- =============================================================================
-- 3. SALES DB — 30 days of confirmed sales
-- =============================================================================
\c sales_db

DO $$
DECLARE
  d DATE;
  sale_id UUID;
  products UUID[] := ARRAY[
    'b0000000-0000-0000-0000-000000000001','b0000000-0000-0000-0000-000000000002',
    'b0000000-0000-0000-0000-000000000003','b0000000-0000-0000-0000-000000000004',
    'b0000000-0000-0000-0000-000000000005','b0000000-0000-0000-0000-000000000006',
    'b0000000-0000-0000-0000-000000000007','b0000000-0000-0000-0000-000000000008',
    'b0000000-0000-0000-0000-000000000009','b0000000-0000-0000-0000-000000000010',
    'b0000000-0000-0000-0000-000000000011','b0000000-0000-0000-0000-000000000012'
  ];
  pnames TEXT[] := ARRAY[
    'Maize Flour (50kg)','Cooking Oil (5L)','Sugar (25kg)','Rice (25kg)',
    'Milk (1L)','Cement (50kg)','Bar Soap (Box)','Milk Powder (500g)',
    'Wheat Flour (10kg)','Bottled Water (Case)','Soap (Carton)','Cooking Gas (15kg)'
  ];
  prices NUMERIC[] := ARRAY[48000,32000,45000,40000,2500,16000,22000,5500,14000,6000,30000,55000];
  cids UUID[] := ARRAY[
    'c0000000-0000-0000-0000-000000000001','c0000000-0000-0000-0000-000000000002',
    'c0000000-0000-0000-0000-000000000003','c0000000-0000-0000-0000-000000000004',
    'c0000000-0000-0000-0000-000000000005','c0000000-0000-0000-0000-000000000006',
    'c0000000-0000-0000-0000-000000000007','c0000000-0000-0000-0000-000000000008',
    'c0000000-0000-0000-0000-000000000009'
  ];
  p INT; q INT; n INT; st NUMERIC; disc NUMERIC; gt NUMERIC; rf TEXT;
BEGIN
  FOR i IN 0..29 LOOP
    d := CURRENT_DATE - (29 - i);
    n := CASE WHEN EXTRACT(DOW FROM d) IN (0,6) THEN 10 ELSE 25 END;

    FOR j IN 1..n LOOP
      sale_id := gen_random_uuid();
      rf := 'INV-' || to_char(d, 'YYYYMMDD') || '-' || lpad(j::text, 4, '0');
      p := 1 + floor(random() * 12)::int;
      q := 1 + floor(random() * 5)::int;
      disc := floor(random() * 3000)::numeric;
      st := prices[p] * q;
      gt := st + round(st * 0.18, 2) - disc;

      INSERT INTO sales (id, ref, date, customer_id, warehouse_id, user_id, status, payment_status,
                         subtotal, tax_total, tax_rate, discount_total, grand_total, paid_total, tenant_id, confirmed_at) VALUES
        (sale_id, rf, d, cids[1 + floor(random() * 9)::int], '1547dccb-7ca3-4083-a823-5330bcf43ecf', NULL,
         'CONFIRMED', 'PAID', st, round(st * 0.18, 2), 18, disc, gt, gt,
         '382626bc-cff4-4843-b2f3-0ed99e5c23a6', d::timestamp + time '08:00' + (random() * interval '12 hours'))
      ON CONFLICT DO NOTHING;

      INSERT INTO sale_lines (id, sale_id, product_id, product_name_snapshot, unit_price, qty, discount, line_subtotal, line_tax, line_total) VALUES
        (gen_random_uuid(), sale_id, products[p], pnames[p], prices[p], q, disc, st, round(st * 0.18, 2), gt)
      ON CONFLICT DO NOTHING;

      -- 50% chance of second product
      IF random() < 0.5 THEN
        p := 1 + floor(random() * 12)::int;
        q := 1 + floor(random() * 3)::int;
        st := prices[p] * q;
        gt := st + round(st * 0.18, 2);
        INSERT INTO sale_lines (id, sale_id, product_id, product_name_snapshot, unit_price, qty, discount, line_subtotal, line_tax, line_total) VALUES
          (gen_random_uuid(), sale_id, products[p], pnames[p], prices[p], q, 0, st, round(st * 0.18, 2), gt)
        ON CONFLICT DO NOTHING;
      END IF;
    END LOOP;
  END LOOP;
END $$;

-- =============================================================================
-- 4. PAYMENT DB — expenses
-- =============================================================================
\c payment_db

INSERT INTO expenses (id, ref, date, account_id, amount, description, tenant_id) VALUES
  (gen_random_uuid(), 'EXP-001', CURRENT_DATE - 5,  '19fc4677-1a76-4518-b734-a71abb327945', 85000,  'Monthly electricity bill', '382626bc-cff4-4843-b2f3-0ed99e5c23a6'),
  (gen_random_uuid(), 'EXP-002', CURRENT_DATE - 12, '19fc4677-1a76-4518-b734-a71abb327945', 120000, 'Shop rent — May 2026',    '382626bc-cff4-4843-b2f3-0ed99e5c23a6'),
  (gen_random_uuid(), 'EXP-003', CURRENT_DATE - 3,  '19fc4677-1a76-4518-b734-a71abb327945', 45000,  'Delivery fuel',           '382626bc-cff4-4843-b2f3-0ed99e5c23a6'),
  (gen_random_uuid(), 'EXP-004', CURRENT_DATE - 8,  '19fc4677-1a76-4518-b734-a71abb327945', 35000,  'Cleaning supplies',       '382626bc-cff4-4843-b2f3-0ed99e5c23a6'),
  (gen_random_uuid(), 'EXP-005', CURRENT_DATE - 1,  '19fc4677-1a76-4518-b734-a71abb327945', 25000,  'Scale repair',            '382626bc-cff4-4843-b2f3-0ed99e5c23a6')
ON CONFLICT DO NOTHING;

\echo '=== Seed complete ==='
\echo 'Products: 12 | Customers: 9 | Suppliers: 5 | Sales: ~500 over 30 days'
\echo 'Expenses: 5 | Stock levels: 12 | Reorder rules: 5'
\echo ''
\echo 'Restart backend services and refresh http://localhost:5199/smartpos/dashboard'
