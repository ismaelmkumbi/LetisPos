CREATE TABLE marketing_banners (
    id              UUID PRIMARY KEY,
    tenant_id       UUID NOT NULL,
    store_id        UUID NOT NULL REFERENCES stores(id),
    name            VARCHAR(255) NOT NULL,
    location        VARCHAR(20) NOT NULL,
    content_html    TEXT,
    image_url       VARCHAR(1000),
    link_url        VARCHAR(1000),
    background_color VARCHAR(7),
    is_active       BOOLEAN NOT NULL DEFAULT false,
    starts_at       TIMESTAMPTZ,
    ends_at         TIMESTAMPTZ,
    display_order   INT NOT NULL DEFAULT 0,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at      TIMESTAMPTZ,
    version         BIGINT NOT NULL DEFAULT 0
);
