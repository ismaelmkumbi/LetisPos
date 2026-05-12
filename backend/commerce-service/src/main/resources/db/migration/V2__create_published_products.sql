CREATE TABLE published_products (
    id              UUID PRIMARY KEY,
    tenant_id       UUID NOT NULL,
    product_id      UUID NOT NULL,
    store_id        UUID NOT NULL REFERENCES stores(id),
    slug            VARCHAR(300) NOT NULL,
    meta_title      VARCHAR(70),
    meta_description VARCHAR(320),
    og_image_url    VARCHAR(1000),
    gallery_urls    TEXT[],
    is_featured     BOOLEAN NOT NULL DEFAULT false,
    display_order   INT NOT NULL DEFAULT 0,
    custom_price    DECIMAL(19,4),
    published_at    TIMESTAMPTZ,
    unpublished_at  TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at      TIMESTAMPTZ,
    version         BIGINT NOT NULL DEFAULT 0,
    UNIQUE(tenant_id, product_id),
    UNIQUE(store_id, slug)
);

CREATE INDEX idx_pp_store ON published_products(store_id, tenant_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_pp_slug ON published_products(slug) WHERE deleted_at IS NULL;

ALTER TABLE published_products ADD COLUMN search_vector tsvector
    GENERATED ALWAYS AS (
        setweight(to_tsvector('english', coalesce(meta_title, '')), 'A') ||
        setweight(to_tsvector('english', coalesce(meta_description, '')), 'B')
    ) STORED;

CREATE INDEX idx_pp_search ON published_products USING GIN(search_vector);
