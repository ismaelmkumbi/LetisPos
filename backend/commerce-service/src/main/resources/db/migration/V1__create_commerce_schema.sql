-- Letis Commerce: Complete Schema
-- Generated from Hibernate-validated schema (2026-05-12)

CREATE TABLE stores (
    id               UUID PRIMARY KEY,
    address_line1    VARCHAR(255),
    address_line2    VARCHAR(255),
    city             VARCHAR(255),
    contact_email    VARCHAR(255),
    contact_phone    VARCHAR(255),
    country          VARCHAR(255),
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    currency         VARCHAR(3) NOT NULL DEFAULT 'USD',
    deleted_at       TIMESTAMPTZ,
    name             VARCHAR(255) NOT NULL,
    order_prefix     VARCHAR(10) DEFAULT 'ONL-',
    postal_code      VARCHAR(255),
    slug             VARCHAR(255) NOT NULL UNIQUE,
    social_facebook  VARCHAR(255),
    social_instagram VARCHAR(255),
    social_twitter   VARCHAR(255),
    state            VARCHAR(255),
    status           VARCHAR(20) NOT NULL DEFAULT 'inactive',
    tax_display      VARCHAR(20) NOT NULL DEFAULT 'exclusive',
    tenant_id        UUID NOT NULL UNIQUE,
    timezone         VARCHAR(50) NOT NULL DEFAULT 'UTC',
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    version          BIGINT NOT NULL DEFAULT 0
);

CREATE TABLE themes (
    id         UUID PRIMARY KEY,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    is_active  BOOLEAN NOT NULL DEFAULT true,
    name       VARCHAR(255) NOT NULL DEFAULT 'Default',
    settings   JSONB DEFAULT '{}',
    store_id   UUID NOT NULL REFERENCES stores(id),
    tenant_id  UUID NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    version    BIGINT NOT NULL DEFAULT 0
);

CREATE TABLE published_products (
    id               UUID PRIMARY KEY,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    custom_price     DECIMAL(19,4),
    deleted_at       TIMESTAMPTZ,
    display_order    INTEGER NOT NULL DEFAULT 0,
    is_featured      BOOLEAN NOT NULL DEFAULT false,
    gallery_urls     TEXT[],
    meta_description VARCHAR(320),
    meta_title       VARCHAR(70),
    og_image_url     VARCHAR(1000),
    product_id       UUID NOT NULL,
    published_at     TIMESTAMPTZ,
    slug             VARCHAR(300) NOT NULL,
    store_id         UUID NOT NULL REFERENCES stores(id),
    tenant_id        UUID NOT NULL,
    unpublished_at   TIMESTAMPTZ,
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    version          BIGINT NOT NULL DEFAULT 0,
    search_vector    TSVECTOR GENERATED ALWAYS AS (
        setweight(to_tsvector('english', COALESCE(meta_title, '')), 'A') ||
        setweight(to_tsvector('english', COALESCE(meta_description, '')), 'B')
    ) STORED
);
CREATE INDEX idx_pp_search ON published_products USING GIN(search_vector);
CREATE INDEX idx_pp_store ON published_products(store_id, tenant_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_pp_slug ON published_products(slug) WHERE deleted_at IS NULL;

CREATE TABLE categories_display (
    id            UUID PRIMARY KEY,
    category_id   UUID NOT NULL,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at    TIMESTAMPTZ,
    description   VARCHAR(255),
    display_order INTEGER NOT NULL DEFAULT 0,
    image_url     VARCHAR(1000),
    is_visible    BOOLEAN NOT NULL DEFAULT true,
    name_override VARCHAR(255),
    parent_id     UUID REFERENCES categories_display(id),
    store_id      UUID NOT NULL REFERENCES stores(id),
    tenant_id     UUID NOT NULL,
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    version       BIGINT NOT NULL DEFAULT 0
);
CREATE INDEX idx_cd_store ON categories_display(store_id) WHERE deleted_at IS NULL;

CREATE TABLE carts (
    id          UUID PRIMARY KEY,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    customer_id UUID,
    session_id  VARCHAR(255),
    status      VARCHAR(20) NOT NULL DEFAULT 'active',
    store_id    UUID NOT NULL REFERENCES stores(id),
    tenant_id   UUID NOT NULL,
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    version     BIGINT NOT NULL DEFAULT 0
);

CREATE TABLE cart_items (
    id           UUID PRIMARY KEY,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    product_id   UUID NOT NULL,
    quantity     INTEGER NOT NULL DEFAULT 1,
    unit_price   DECIMAL(19,4) NOT NULL,
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    variant_data JSONB,
    cart_id      UUID NOT NULL REFERENCES carts(id) ON DELETE CASCADE
);
CREATE INDEX idx_cart_items_cart ON cart_items(cart_id);
CREATE INDEX idx_carts_customer ON carts(customer_id) WHERE status = 'active';

CREATE TABLE shipping_zones (
    id         UUID PRIMARY KEY,
    countries  TEXT[],
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    is_active  BOOLEAN NOT NULL DEFAULT true,
    name       VARCHAR(255) NOT NULL,
    rates      JSONB DEFAULT '[]',
    regions    TEXT[],
    store_id   UUID NOT NULL REFERENCES stores(id),
    tenant_id  UUID NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    version    BIGINT NOT NULL DEFAULT 0
);

CREATE TABLE navigation_menus (
    id         UUID PRIMARY KEY,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    items      JSONB DEFAULT '[]',
    location   VARCHAR(20) NOT NULL,
    store_id   UUID NOT NULL REFERENCES stores(id),
    tenant_id  UUID NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    version    BIGINT NOT NULL DEFAULT 0
);

CREATE TABLE store_pages (
    id               UUID PRIMARY KEY,
    content          TEXT,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at       TIMESTAMPTZ,
    is_published     BOOLEAN NOT NULL DEFAULT true,
    key              VARCHAR(255) NOT NULL,
    meta_description VARCHAR(255),
    meta_title       VARCHAR(255),
    store_id         UUID NOT NULL REFERENCES stores(id),
    tenant_id        UUID NOT NULL,
    title            VARCHAR(255) NOT NULL,
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    version          BIGINT NOT NULL DEFAULT 0
);

CREATE TABLE marketing_banners (
    id               UUID PRIMARY KEY,
    background_color VARCHAR(20),
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at       TIMESTAMPTZ,
    display_order    INTEGER NOT NULL DEFAULT 0,
    ends_at          TIMESTAMPTZ,
    image_url        VARCHAR(255),
    is_active        BOOLEAN NOT NULL DEFAULT false,
    link_text        VARCHAR(255),
    link_url         VARCHAR(255),
    starts_at        TIMESTAMPTZ,
    store_id         UUID NOT NULL REFERENCES stores(id),
    subtitle         VARCHAR(255),
    tenant_id        UUID NOT NULL,
    text_color       VARCHAR(20),
    title            VARCHAR(255) NOT NULL,
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    version          BIGINT NOT NULL DEFAULT 0
);

CREATE TABLE seo_defaults (
    id                        UUID PRIMARY KEY,
    created_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    custom_head_html          TEXT,
    google_site_verification  VARCHAR(255),
    meta_description_template VARCHAR(255),
    meta_title_template       VARCHAR(255),
    og_image_url              VARCHAR(255),
    robots_txt                TEXT,
    store_id                  UUID NOT NULL REFERENCES stores(id),
    tenant_id                 UUID NOT NULL,
    twitter_handle            VARCHAR(255),
    updated_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    version                   BIGINT NOT NULL DEFAULT 0
);

CREATE TABLE custom_domains (
    id                UUID PRIMARY KEY,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    domain            VARCHAR(255) NOT NULL UNIQUE,
    is_primary        BOOLEAN NOT NULL DEFAULT false,
    is_verified       BOOLEAN NOT NULL DEFAULT false,
    ssl_enabled       BOOLEAN NOT NULL DEFAULT false,
    store_id          UUID NOT NULL REFERENCES stores(id),
    tenant_id         UUID NOT NULL,
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    verification_code VARCHAR(255) NOT NULL,
    verified_at       TIMESTAMPTZ,
    version           BIGINT NOT NULL DEFAULT 0
);

CREATE TABLE customer_addresses (
    id          UUID PRIMARY KEY,
    city        VARCHAR(100) NOT NULL,
    country     VARCHAR(100) NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    customer_id UUID NOT NULL,
    deleted_at  TIMESTAMPTZ,
    first_name  VARCHAR(100) NOT NULL,
    is_default  BOOLEAN NOT NULL DEFAULT false,
    label       VARCHAR(100) NOT NULL DEFAULT 'Home',
    last_name   VARCHAR(100) NOT NULL,
    line1       VARCHAR(255) NOT NULL,
    line2       VARCHAR(255),
    phone       VARCHAR(50),
    postal_code VARCHAR(20) NOT NULL,
    state       VARCHAR(100),
    store_id    UUID NOT NULL REFERENCES stores(id),
    tenant_id   UUID NOT NULL,
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    version     BIGINT NOT NULL DEFAULT 0
);
CREATE INDEX idx_ca_customer ON customer_addresses(customer_id) WHERE deleted_at IS NULL;

CREATE TABLE customers (
    id            UUID PRIMARY KEY,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    email         VARCHAR(255) NOT NULL,
    first_name    VARCHAR(100) NOT NULL,
    last_name     VARCHAR(100) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    phone         VARCHAR(50),
    store_id      UUID NOT NULL REFERENCES stores(id),
    tenant_id     UUID NOT NULL,
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    version       BIGINT NOT NULL DEFAULT 0,
    UNIQUE(store_id, email)
);
