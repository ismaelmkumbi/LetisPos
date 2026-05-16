-- V14: Backfill product_name_snapshot for rows with "Unknown Product" or UUIDs.
-- Assumes the products table is in the same database (shared DB deployment).
-- For separate-DB deployments, this migration is a no-op and backfill must
-- be handled via dblink, FDW, or a manual script.

-- 1. sale_lines
UPDATE sale_lines sl
SET product_name_snapshot = p.name
FROM products p
WHERE sl.product_id = p.id
  AND p.deleted_at IS NULL
  AND (sl.product_name_snapshot = 'Unknown Product'
       OR sl.product_name_snapshot ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$');

-- 2. purchase_lines
UPDATE purchase_lines pl
SET product_name_snapshot = p.name
FROM products p
WHERE pl.product_id = p.id
  AND p.deleted_at IS NULL
  AND (pl.product_name_snapshot = 'Unknown Product'
       OR pl.product_name_snapshot ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$');

-- 3. quotation_lines
UPDATE quotation_lines ql
SET product_name_snapshot = p.name
FROM products p
WHERE ql.product_id = p.id
  AND p.deleted_at IS NULL
  AND (ql.product_name_snapshot = 'Unknown Product'
       OR ql.product_name_snapshot ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$');

-- 4. sale_return_lines
UPDATE sale_return_lines srl
SET product_name_snapshot = p.name
FROM products p
WHERE srl.product_id = p.id
  AND p.deleted_at IS NULL
  AND (srl.product_name_snapshot = 'Unknown Product'
       OR srl.product_name_snapshot ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$');

-- 5. purchase_return_lines
UPDATE purchase_return_lines prl
SET product_name_snapshot = p.name
FROM products p
WHERE prl.product_id = p.id
  AND p.deleted_at IS NULL
  AND (prl.product_name_snapshot = 'Unknown Product'
       OR prl.product_name_snapshot ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$');
