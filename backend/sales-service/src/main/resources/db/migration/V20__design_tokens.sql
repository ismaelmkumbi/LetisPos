-- V20: Design Tokens — normalized token storage for brand theming
-- Enables CSS variable injection, PDF/email/thermal rendering, and token-based theming
--
-- The design_tokens table stores custom/overridden tokens per tenant.
-- For tokens not found here, the system falls back to computing them from brand_profiles.

CREATE TABLE design_tokens (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID NOT NULL,
    token_path      VARCHAR(200) NOT NULL,  -- e.g. 'surface.card.background', 'color.primary.600'
    token_value     TEXT NOT NULL,          -- hex, rem, px, percent, or alias reference (e.g. '{neutral.900}')
    token_type      VARCHAR(30) NOT NULL,   -- color, spacing, radius, shadow, typography, etc.
    scope           VARCHAR(20) DEFAULT 'all',  -- web, pdf, thermal, email, mobile
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Unique constraint prevents duplicate token definitions per tenant
CREATE UNIQUE INDEX uq_design_tokens_tenant_path ON design_tokens(tenant_id, token_path);
-- Index for fast lookup by tenant
CREATE INDEX idx_design_tokens_tenant ON design_tokens(tenant_id);

-- No seed data needed - service will generate default tokens from brand_profiles as fallback