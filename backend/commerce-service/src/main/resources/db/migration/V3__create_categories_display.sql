CREATE TABLE categories_display (
    id              UUID PRIMARY KEY,
    tenant_id       UUID NOT NULL,
    store_id        UUID NOT NULL REFERENCES stores(id),
    category_id     UUID NOT NULL,
    name_override   VARCHAR(255),
    description     TEXT,
    image_url       VARCHAR(1000),
    display_order   INT NOT NULL DEFAULT 0,
    is_visible      BOOLEAN NOT NULL DEFAULT true,
    parent_id       UUID REFERENCES categories_display(id),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at      TIMESTAMPTZ,
    version         BIGINT NOT NULL DEFAULT 0
);

CREATE INDEX idx_cd_store ON categories_display(store_id) WHERE deleted_at IS NULL;
