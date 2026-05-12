CREATE TABLE seo_defaults (
    id              UUID PRIMARY KEY,
    tenant_id       UUID NOT NULL,
    store_id        UUID NOT NULL UNIQUE REFERENCES stores(id),
    site_title       VARCHAR(70),
    site_description VARCHAR(320),
    og_image_url    VARCHAR(1000),
    twitter_handle  VARCHAR(50),
    google_analytics_id VARCHAR(50),
    google_site_verification VARCHAR(100),
    structured_data JSONB,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    version         BIGINT NOT NULL DEFAULT 0
);
