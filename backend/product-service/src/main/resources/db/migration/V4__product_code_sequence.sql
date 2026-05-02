-- Auto-SKU support: a global, monotonic sequence the service uses to mint
-- product codes (e.g. PROD-000001) when the caller doesn't supply one.
--
-- A single global sequence is safe because the uniqueness index on
-- (tenant_id, lower(code)) holds for any value the sequence yields, and
-- users don't generally care if the visible numbers jump.
--
-- We do NOT add a column DEFAULT — generating the code in the service
-- layer keeps the application in control of the format and lets us
-- preview the value via GET /api/v1/products/next-sku before save.

CREATE SEQUENCE IF NOT EXISTS product_code_seq
    START WITH 1
    INCREMENT BY 1
    MINVALUE 1
    NO MAXVALUE
    NO CYCLE;
