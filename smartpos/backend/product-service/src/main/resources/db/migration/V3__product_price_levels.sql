-- Product Service V3 — Stocky parity: multi-tier pricing & marketing flags
--
-- Adds:
--   * Wholesale + minimum-selling price for products and variants
--   * Loyalty points awarded per unit sold
--   * Featured + hide-from-online-store marketing toggles
--   * Sub-category foreign reference (a category can be a parent of another)
--   * Barcode symbology stored on the product itself (used as the default
--     when generating an automatic barcode at sale time)

-- ------------------------------------------------------------------
-- Products: pricing tiers + marketing
-- ------------------------------------------------------------------
ALTER TABLE products
    ADD COLUMN wholesale_price        NUMERIC(19,4),
    ADD COLUMN min_price              NUMERIC(19,4),
    ADD COLUMN points                 INT          NOT NULL DEFAULT 0,
    ADD COLUMN featured               BOOLEAN      NOT NULL DEFAULT FALSE,
    ADD COLUMN hide_online            BOOLEAN      NOT NULL DEFAULT FALSE,
    ADD COLUMN sub_category_id        UUID,
    ADD COLUMN barcode_symbology      VARCHAR(16)  NOT NULL DEFAULT 'CODE128';

CREATE INDEX idx_products_featured  ON products (featured)    WHERE featured    = TRUE;
CREATE INDEX idx_products_subcat    ON products (sub_category_id) WHERE sub_category_id IS NOT NULL;

-- ------------------------------------------------------------------
-- Variants: pricing tiers (override at variant level)
-- ------------------------------------------------------------------
ALTER TABLE product_variants
    ADD COLUMN wholesale_price NUMERIC(19,4),
    ADD COLUMN min_price       NUMERIC(19,4);
