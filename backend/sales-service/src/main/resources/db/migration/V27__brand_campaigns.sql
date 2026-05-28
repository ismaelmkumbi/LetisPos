-- V27: Brand Campaigns — seasonal/scheduled brand overrides

CREATE TABLE brand_campaigns (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID NOT NULL,
    name            VARCHAR(100) NOT NULL,
    description     TEXT DEFAULT '',
    start_date      DATE NOT NULL,
    end_date        DATE NOT NULL,
    brand_config    JSONB NOT NULL,  -- {primaryColor, secondaryColor, accentColor, fontFamily, logoUrl, tagline}
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_brand_campaigns_tenant ON brand_campaigns(tenant_id);
CREATE INDEX idx_brand_campaigns_dates ON brand_campaigns(start_date, end_date);
