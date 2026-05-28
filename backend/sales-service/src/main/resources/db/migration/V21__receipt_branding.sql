-- V21: Receipt Branding — thermal receipt configuration per tenant

CREATE TABLE receipt_branding (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID UNIQUE NOT NULL,

    -- Header / footer
    header_text     VARCHAR(255) DEFAULT '',
    footer_text     VARCHAR(500) DEFAULT '',
    show_logo       BOOLEAN NOT NULL DEFAULT TRUE,
    logo_width_mm   DECIMAL(4,1) NOT NULL DEFAULT 48.0,

    -- Content visibility
    show_qr_code        BOOLEAN NOT NULL DEFAULT FALSE,
    show_barcode        BOOLEAN NOT NULL DEFAULT TRUE,
    show_customer_info  BOOLEAN NOT NULL DEFAULT TRUE,

    -- Paper & layout
    paper_width_mm      VARCHAR(10) NOT NULL DEFAULT '80',

    -- Typography (mm-based for ESC/POS)
    font_size_small     DECIMAL(3,1) NOT NULL DEFAULT 1.8,
    font_size_normal    DECIMAL(3,1) NOT NULL DEFAULT 2.2,
    font_size_large     DECIMAL(3,1) NOT NULL DEFAULT 3.0,
    line_spacing        DECIMAL(3,1) NOT NULL DEFAULT 1.2,

    -- Hardware behaviour
    cut_paper_after_print  BOOLEAN NOT NULL DEFAULT TRUE,
    open_cash_drawer       BOOLEAN NOT NULL DEFAULT TRUE,

    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_receipt_branding_tenant ON receipt_branding(tenant_id);
