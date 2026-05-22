-- V16: Brand Identity — tenant-level brand profiles, assets, and AI job tracking
-- Extracted from pos_settings.store_* fields to a dedicated tenant-global table.

CREATE TABLE brand_profiles (
    id              UUID PRIMARY KEY,
    tenant_id       UUID UNIQUE NOT NULL,

    -- Business identity
    business_name   VARCHAR(255) NOT NULL DEFAULT '',
    tagline         VARCHAR(255) NOT NULL DEFAULT '',
    description     TEXT         NOT NULL DEFAULT '',
    industry        VARCHAR(128) NOT NULL DEFAULT 'Retail',
    brand_tone      VARCHAR(64)  NOT NULL DEFAULT 'Professional',

    -- Visual identity (hex colors)
    primary_color   VARCHAR(7) NOT NULL DEFAULT '#16A34A',
    secondary_color VARCHAR(7) NOT NULL DEFAULT '#1E293B',
    accent_color    VARCHAR(7) NOT NULL DEFAULT '#16A34A',

    -- Typography
    font_family     VARCHAR(512) NOT NULL DEFAULT 'Inter, system-ui, sans-serif',
    typography_scale VARCHAR(16) NOT NULL DEFAULT 'default',  -- compact | default | spacious

    -- Asset URLs (CDN / MinIO)
    logo_url            TEXT NOT NULL DEFAULT '',
    logo_svg_url        TEXT NOT NULL DEFAULT '',
    logo_monochrome_url TEXT NOT NULL DEFAULT '',
    logo_thermal_url    TEXT NOT NULL DEFAULT '',
    favicon_url         TEXT NOT NULL DEFAULT '',
    watermark_url       TEXT NOT NULL DEFAULT '',
    stamp_url           TEXT NOT NULL DEFAULT '',
    signature_url       TEXT NOT NULL DEFAULT '',
    qr_code_url         TEXT NOT NULL DEFAULT '',

    -- Web & social
    website     VARCHAR(512) NOT NULL DEFAULT '',
    facebook    VARCHAR(512) NOT NULL DEFAULT '',
    instagram   VARCHAR(512) NOT NULL DEFAULT '',
    twitter     VARCHAR(512) NOT NULL DEFAULT '',
    linkedin    VARCHAR(512) NOT NULL DEFAULT '',

    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Auto-create a default brand profile per tenant (triggered on tenant creation)
CREATE INDEX idx_brand_profiles_tenant ON brand_profiles (tenant_id);

-- ── Brand assets (uploaded logos, AI-generated variants, favicons, etc.) ──

CREATE TABLE brand_assets (
    id          UUID PRIMARY KEY,
    tenant_id   UUID NOT NULL,

    name        VARCHAR(255) NOT NULL,
    category    VARCHAR(32)  NOT NULL,  -- logo | favicon | watermark | stamp | signature | qr | other
    format      VARCHAR(8)   NOT NULL,  -- png | svg | jpg | webp | pdf
    variant     VARCHAR(32)  NOT NULL DEFAULT 'original',  -- original | monochrome | thermal | favicon | thumbnail

    -- Storage
    url         TEXT         NOT NULL,
    storage_key VARCHAR(512) NOT NULL,   -- S3/MinIO object key
    width       INT,
    height      INT,
    size_bytes  BIGINT       NOT NULL DEFAULT 0,

    -- AI metadata
    ai_generated     BOOLEAN NOT NULL DEFAULT FALSE,
    ai_job_id        UUID,

    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_brand_assets_tenant   ON brand_assets (tenant_id);
CREATE INDEX idx_brand_assets_category ON brand_assets (tenant_id, category);
CREATE INDEX idx_brand_assets_variant  ON brand_assets (tenant_id, variant);

-- ── AI branding jobs (async processing) ──

CREATE TABLE brand_ai_jobs (
    id          UUID PRIMARY KEY,
    tenant_id   UUID NOT NULL,

    kind        VARCHAR(64) NOT NULL,  -- ANALYZE_LOGO | GENERATE_VARIANTS | GENERATE_PALETTE
                                       -- SUGGEST_FONTS | GENERATE_THEME | CHAT
    status      VARCHAR(32) NOT NULL DEFAULT 'PENDING',  -- PENDING | RUNNING | COMPLETED | FAILED
    request     JSONB,
    result      JSONB,
    error_msg   TEXT,

    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_brand_ai_jobs_tenant ON brand_ai_jobs (tenant_id);

-- ── Backfill: seed brand_profiles from existing pos_settings ──
-- Takes the first pos_settings record per tenant and copies store info.
-- Only runs if there are tenants with pos_settings but no brand_profile.

INSERT INTO brand_profiles (id, tenant_id, business_name, logo_url, website,
                            primary_color, secondary_color, accent_color,
                            font_family, typography_scale, created_at, updated_at)
SELECT
    gen_random_uuid()                              AS id,
    ps.tenant_id                                   AS tenant_id,
    MAX(ps.store_name)                             AS business_name,
    MAX(ps.logo_url)                               AS logo_url,
    MAX(ps.store_website)                          AS website,
    '#16A34A'                                      AS primary_color,
    '#1E293B'                                      AS secondary_color,
    '#16A34A'                                      AS accent_color,
    'Inter, system-ui, sans-serif'                 AS font_family,
    'default'                                      AS typography_scale,
    now()                                          AS created_at,
    now()                                          AS updated_at
FROM pos_settings ps
WHERE ps.tenant_id IS NOT NULL
  AND NOT EXISTS (
      SELECT 1 FROM brand_profiles bp WHERE bp.tenant_id = ps.tenant_id
  )
GROUP BY ps.tenant_id;
