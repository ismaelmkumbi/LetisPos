-- Product Service — initial schema
-- Owns catalog (products/variants/barcodes), classification (categories/brands/units),
-- and party masters (customers, suppliers).

CREATE EXTENSION IF NOT EXISTS citext;
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ------------------------------------------------------------------
-- Classification
-- ------------------------------------------------------------------
CREATE TABLE categories (
    id          UUID        PRIMARY KEY,
    parent_id   UUID        REFERENCES categories(id) ON DELETE SET NULL,
    name        VARCHAR(150) NOT NULL,
    code        VARCHAR(50),
    image_url   TEXT,
    description TEXT,
    tenant_id   UUID,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_categories_parent ON categories (parent_id);
CREATE UNIQUE INDEX idx_categories_tenant_code ON categories (tenant_id, lower(code)) WHERE code IS NOT NULL;

CREATE TABLE brands (
    id          UUID        PRIMARY KEY,
    name        VARCHAR(150) NOT NULL,
    image_url   TEXT,
    description TEXT,
    tenant_id   UUID,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX idx_brands_tenant_name ON brands (tenant_id, lower(name));

CREATE TABLE units (
    id                  UUID        PRIMARY KEY,
    name                VARCHAR(80) NOT NULL,
    short_name          VARCHAR(16) NOT NULL,
    base_unit_id        UUID REFERENCES units(id) ON DELETE SET NULL,
    conversion_factor   NUMERIC(19,6) NOT NULL DEFAULT 1,
    tenant_id           UUID,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX idx_units_tenant_short ON units (tenant_id, lower(short_name));

-- ------------------------------------------------------------------
-- Products
-- ------------------------------------------------------------------
CREATE TABLE products (
    id             UUID        PRIMARY KEY,
    code           VARCHAR(64) NOT NULL,                     -- SKU
    name           VARCHAR(255) NOT NULL,
    description    TEXT,
    category_id    UUID REFERENCES categories(id) ON DELETE SET NULL,
    brand_id       UUID REFERENCES brands(id)     ON DELETE SET NULL,
    unit_id        UUID REFERENCES units(id)      ON DELETE SET NULL,
    cost           NUMERIC(19,4) NOT NULL DEFAULT 0,
    price          NUMERIC(19,4) NOT NULL DEFAULT 0,
    tax_method     VARCHAR(20)  NOT NULL DEFAULT 'EXCLUSIVE',
    tax_rate       NUMERIC(5,2) NOT NULL DEFAULT 0,
    stock_alert    INT          NOT NULL DEFAULT 0,
    is_variant     BOOLEAN      NOT NULL DEFAULT FALSE,
    type           VARCHAR(20)  NOT NULL DEFAULT 'STANDARD', -- STANDARD | SERVICE | COMBO
    status         BOOLEAN      NOT NULL DEFAULT TRUE,
    image_url      TEXT,
    tenant_id      UUID,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at     TIMESTAMPTZ,
    version        BIGINT      NOT NULL DEFAULT 0,
    CONSTRAINT products_tax_method_chk CHECK (tax_method IN ('INCLUSIVE','EXCLUSIVE')),
    CONSTRAINT products_type_chk       CHECK (type IN ('STANDARD','SERVICE','COMBO'))
);
CREATE UNIQUE INDEX idx_products_tenant_code ON products (tenant_id, lower(code)) WHERE deleted_at IS NULL;
CREATE INDEX idx_products_category ON products (category_id);
CREATE INDEX idx_products_brand    ON products (brand_id);
CREATE INDEX idx_products_status   ON products (status) WHERE deleted_at IS NULL;
-- Trigram index for fast POS search across product name
CREATE INDEX idx_products_name_trgm ON products USING gin (name gin_trgm_ops);

CREATE TABLE product_variants (
    id          UUID        PRIMARY KEY,
    product_id  UUID        NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    name        VARCHAR(150) NOT NULL,
    code        VARCHAR(64),
    cost        NUMERIC(19,4),
    price       NUMERIC(19,4),
    image_url   TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (product_id, name)
);
CREATE INDEX idx_variants_product ON product_variants (product_id);

CREATE TABLE product_barcodes (
    id           UUID        PRIMARY KEY,
    product_id   UUID        NOT NULL REFERENCES products(id)         ON DELETE CASCADE,
    variant_id   UUID        REFERENCES product_variants(id)          ON DELETE CASCADE,
    barcode      VARCHAR(64) NOT NULL,
    barcode_type VARCHAR(20) NOT NULL DEFAULT 'CODE128', -- CODE128 | EAN13 | EAN8 | UPCA | QR
    is_primary   BOOLEAN     NOT NULL DEFAULT FALSE,
    tenant_id    UUID,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX idx_barcodes_tenant_code ON product_barcodes (tenant_id, barcode);
CREATE INDEX idx_barcodes_product ON product_barcodes (product_id);

-- Combo / bundle composition (for type='COMBO')
CREATE TABLE product_combo_items (
    id                  UUID        PRIMARY KEY,
    combo_product_id    UUID        NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    component_product_id UUID       NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
    qty                 NUMERIC(19,4) NOT NULL DEFAULT 1,
    UNIQUE (combo_product_id, component_product_id)
);

-- ------------------------------------------------------------------
-- Parties
-- ------------------------------------------------------------------
CREATE TABLE customers (
    id            UUID        PRIMARY KEY,
    code          VARCHAR(50),
    name          VARCHAR(200) NOT NULL,
    email         CITEXT,
    phone         VARCHAR(32),
    tax_number    VARCHAR(64),
    address       TEXT,
    city          VARCHAR(100),
    country       VARCHAR(100),
    credit_limit  NUMERIC(19,4) NOT NULL DEFAULT 0,
    notes         TEXT,
    is_active     BOOLEAN     NOT NULL DEFAULT TRUE,
    tenant_id     UUID,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at    TIMESTAMPTZ
);
CREATE UNIQUE INDEX idx_customers_tenant_code ON customers (tenant_id, lower(code)) WHERE code IS NOT NULL AND deleted_at IS NULL;
CREATE INDEX idx_customers_name_trgm ON customers USING gin (name gin_trgm_ops);
CREATE INDEX idx_customers_phone     ON customers (phone);
CREATE INDEX idx_customers_email     ON customers (email);

CREATE TABLE suppliers (
    id            UUID        PRIMARY KEY,
    code          VARCHAR(50),
    name          VARCHAR(200) NOT NULL,
    email         CITEXT,
    phone         VARCHAR(32),
    tax_number    VARCHAR(64),
    address       TEXT,
    city          VARCHAR(100),
    country       VARCHAR(100),
    notes         TEXT,
    is_active     BOOLEAN     NOT NULL DEFAULT TRUE,
    tenant_id     UUID,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at    TIMESTAMPTZ
);
CREATE UNIQUE INDEX idx_suppliers_tenant_code ON suppliers (tenant_id, lower(code)) WHERE code IS NOT NULL AND deleted_at IS NULL;
CREATE INDEX idx_suppliers_name_trgm ON suppliers USING gin (name gin_trgm_ops);
CREATE INDEX idx_suppliers_phone     ON suppliers (phone);

-- ------------------------------------------------------------------
-- Outbox for emitting ProductCreated / ProductUpdated etc.
-- ------------------------------------------------------------------
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

-- ------------------------------------------------------------------
-- Seed baseline units — common retail UoMs
-- ------------------------------------------------------------------
INSERT INTO units (id, name, short_name) VALUES
  (uuid_generate_v4(), 'Piece',      'pcs'),
  (uuid_generate_v4(), 'Box',        'box'),
  (uuid_generate_v4(), 'Kilogram',   'kg'),
  (uuid_generate_v4(), 'Gram',       'g'),
  (uuid_generate_v4(), 'Litre',      'L'),
  (uuid_generate_v4(), 'Millilitre', 'ml'),
  (uuid_generate_v4(), 'Metre',      'm'),
  (uuid_generate_v4(), 'Dozen',      'dz'),
  (uuid_generate_v4(), 'Pack',       'pk');
