-- V14: Backfill product_name_snapshot for rows with "Unknown Product" or UUIDs.
-- Only runs if the products table is in the same database. For separate-DB
-- deployments the migration is a safe no-op; backfill must be handled via
-- dblink, FDW, or a manual script.

DO $$
DECLARE
    uuid_re TEXT := '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables
               WHERE table_schema = 'public' AND table_name = 'products') THEN

        EXECUTE '
        UPDATE sale_lines sl
        SET product_name_snapshot = p.name
        FROM products p
        WHERE sl.product_id = p.id
          AND p.deleted_at IS NULL
          AND (sl.product_name_snapshot = ''Unknown Product''
               OR sl.product_name_snapshot ~ $1)'
        USING uuid_re;

        EXECUTE '
        UPDATE purchase_lines pl
        SET product_name_snapshot = p.name
        FROM products p
        WHERE pl.product_id = p.id
          AND p.deleted_at IS NULL
          AND (pl.product_name_snapshot = ''Unknown Product''
               OR pl.product_name_snapshot ~ $1)'
        USING uuid_re;

        EXECUTE '
        UPDATE quotation_lines ql
        SET product_name_snapshot = p.name
        FROM products p
        WHERE ql.product_id = p.id
          AND p.deleted_at IS NULL
          AND (ql.product_name_snapshot = ''Unknown Product''
               OR ql.product_name_snapshot ~ $1)'
        USING uuid_re;

        EXECUTE '
        UPDATE sale_return_lines srl
        SET product_name_snapshot = p.name
        FROM products p
        WHERE srl.product_id = p.id
          AND p.deleted_at IS NULL
          AND (srl.product_name_snapshot = ''Unknown Product''
               OR srl.product_name_snapshot ~ $1)'
        USING uuid_re;

        EXECUTE '
        UPDATE purchase_return_lines prl
        SET product_name_snapshot = p.name
        FROM products p
        WHERE prl.product_id = p.id
          AND p.deleted_at IS NULL
          AND (prl.product_name_snapshot = ''Unknown Product''
               OR prl.product_name_snapshot ~ $1)'
        USING uuid_re;

        RAISE NOTICE 'V14: Backfilled product_name_snapshot across all 5 line tables.';
    ELSE
        RAISE NOTICE 'V14: products table not in same database — skipping backfill.';
    END IF;
END $$;
