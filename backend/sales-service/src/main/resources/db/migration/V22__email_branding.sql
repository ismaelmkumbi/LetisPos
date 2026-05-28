-- V22: Email Branding — email template configuration per tenant

CREATE TABLE email_branding (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID UNIQUE NOT NULL,

    -- Sender identity
    sender_name     VARCHAR(255) DEFAULT '',
    sender_email    VARCHAR(255) DEFAULT '',
    reply_to        VARCHAR(255) DEFAULT '',

    -- Global footer (appended to all emails)
    footer_text     TEXT DEFAULT '',
    show_social_links   BOOLEAN NOT NULL DEFAULT TRUE,

    -- Template overrides stored as JSON columns (keeps the single-row model)
    invoice_subject_template     VARCHAR(500) DEFAULT '',
    invoice_body_html            TEXT DEFAULT '',
    receipt_subject_template     VARCHAR(500) DEFAULT '',
    receipt_body_html            TEXT DEFAULT '',
    welcome_subject_template     VARCHAR(500) DEFAULT '',
    welcome_body_html            TEXT DEFAULT '',
    reset_password_subject_template  VARCHAR(500) DEFAULT '',
    reset_password_body_html         TEXT DEFAULT '',

    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_email_branding_tenant ON email_branding(tenant_id);
