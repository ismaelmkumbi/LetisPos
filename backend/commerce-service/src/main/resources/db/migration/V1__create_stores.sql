CREATE TABLE stores (
    id              UUID PRIMARY KEY,
    tenant_id       UUID NOT NULL UNIQUE,
    name            VARCHAR(255) NOT NULL,
    slug            VARCHAR(100) NOT NULL UNIQUE,
    status          VARCHAR(20) NOT NULL DEFAULT 'inactive',
    contact_email   VARCHAR(255),
    contact_phone   VARCHAR(50),
    address_line1   VARCHAR(255),
    address_line2   VARCHAR(255),
    city            VARCHAR(100),
    state           VARCHAR(100),
    country         VARCHAR(100),
    postal_code     VARCHAR(20),
    currency        VARCHAR(3) NOT NULL DEFAULT 'USD',
    timezone        VARCHAR(50) NOT NULL DEFAULT 'UTC',
    tax_display     VARCHAR(20) NOT NULL DEFAULT 'exclusive',
    social_facebook VARCHAR(500),
    social_instagram VARCHAR(500),
    social_twitter  VARCHAR(500),
    order_prefix    VARCHAR(10) DEFAULT 'ONL-',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at      TIMESTAMPTZ,
    version         BIGINT NOT NULL DEFAULT 0
);

CREATE INDEX idx_stores_slug ON stores(slug) WHERE deleted_at IS NULL;
CREATE INDEX idx_stores_tenant ON stores(tenant_id) WHERE deleted_at IS NULL;
