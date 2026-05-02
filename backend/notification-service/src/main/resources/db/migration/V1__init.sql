-- Notification Service — initial schema
-- Owns: message templates (email/SMS/WhatsApp), per-tenant channel settings,
-- and an immutable delivery log used for status reporting and retries.

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ------------------------------------------------------------------
-- Templates — re-usable bodies with {{placeholder}} substitution.
-- A single template can target one channel; cross-channel parity is
-- modelled by issuing the same `code` with different `channel` values.
-- ------------------------------------------------------------------
CREATE TABLE notification_templates (
    id          UUID         PRIMARY KEY,
    code        VARCHAR(80)  NOT NULL,                        -- e.g. SALE_RECEIPT, QUOTATION_SENT
    channel     VARCHAR(16)  NOT NULL,                        -- EMAIL | SMS | WHATSAPP
    name        VARCHAR(150) NOT NULL,
    subject     VARCHAR(255),                                 -- email only
    body        TEXT         NOT NULL,                        -- text/HTML for email; plain for sms/whatsapp
    is_html     BOOLEAN      NOT NULL DEFAULT FALSE,
    is_default  BOOLEAN      NOT NULL DEFAULT FALSE,          -- one default per (tenant, code, channel)
    enabled     BOOLEAN      NOT NULL DEFAULT TRUE,
    tenant_id   UUID,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ  NOT NULL DEFAULT now(),
    CONSTRAINT  notification_templates_channel_chk CHECK (channel IN ('EMAIL','SMS','WHATSAPP'))
);
CREATE UNIQUE INDEX idx_templates_tenant_code_channel
    ON notification_templates (tenant_id, code, channel);
CREATE UNIQUE INDEX idx_templates_default
    ON notification_templates (tenant_id, code, channel)
    WHERE is_default = TRUE;

-- ------------------------------------------------------------------
-- Delivery log — every send attempt. Status moves PENDING → SENT or FAILED.
-- `provider_message_id` is the upstream gateway id (Twilio SID, SMTP message-id)
-- used later for delivery-receipt webhooks.
-- ------------------------------------------------------------------
CREATE TABLE notification_deliveries (
    id                    UUID         PRIMARY KEY,
    channel               VARCHAR(16)  NOT NULL,
    template_code         VARCHAR(80),
    recipient             VARCHAR(255) NOT NULL,             -- email or phone (E.164)
    subject               VARCHAR(255),
    rendered_body         TEXT         NOT NULL,
    status                VARCHAR(16)  NOT NULL DEFAULT 'PENDING', -- PENDING | SENT | FAILED
    error_message         TEXT,
    provider_message_id   VARCHAR(255),
    attempts              INT          NOT NULL DEFAULT 0,
    related_aggregate     VARCHAR(80),                        -- e.g. "Sale", "Quotation"
    related_aggregate_id  UUID,
    payload_meta          JSONB,                              -- caller-supplied context
    tenant_id             UUID,
    created_at            TIMESTAMPTZ  NOT NULL DEFAULT now(),
    sent_at               TIMESTAMPTZ,
    next_retry_at         TIMESTAMPTZ,
    CONSTRAINT notification_deliveries_channel_chk CHECK (channel IN ('EMAIL','SMS','WHATSAPP')),
    CONSTRAINT notification_deliveries_status_chk  CHECK (status  IN ('PENDING','SENT','FAILED'))
);
CREATE INDEX idx_deliveries_status      ON notification_deliveries (status, next_retry_at);
CREATE INDEX idx_deliveries_recipient   ON notification_deliveries (recipient);
CREATE INDEX idx_deliveries_aggregate   ON notification_deliveries (related_aggregate, related_aggregate_id);
CREATE INDEX idx_deliveries_created     ON notification_deliveries (created_at DESC);

-- ------------------------------------------------------------------
-- Per-tenant channel settings (overrides defaults from application.yml).
-- Stored as a single row per (tenant, channel) keyed by JSON config.
-- ------------------------------------------------------------------
CREATE TABLE notification_channel_settings (
    id          UUID         PRIMARY KEY,
    tenant_id   UUID,
    channel     VARCHAR(16)  NOT NULL,
    enabled     BOOLEAN      NOT NULL DEFAULT TRUE,
    config      JSONB        NOT NULL DEFAULT '{}'::jsonb,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ  NOT NULL DEFAULT now(),
    CONSTRAINT  channel_settings_channel_chk CHECK (channel IN ('EMAIL','SMS','WHATSAPP'))
);
CREATE UNIQUE INDEX idx_channel_settings_tenant_channel
    ON notification_channel_settings (tenant_id, channel);

-- ------------------------------------------------------------------
-- Seed minimal default templates (tenant-less = global fallback).
-- ------------------------------------------------------------------
INSERT INTO notification_templates (id, code, channel, name, subject, body, is_html, is_default) VALUES
  (uuid_generate_v4(), 'SALE_RECEIPT',     'EMAIL',    'Sale Receipt',
   'Your receipt from {{company_name}}',
   '<p>Hi {{customer_name}},</p><p>Thank you for your purchase. Total: {{total}}.</p>', TRUE, TRUE),
  (uuid_generate_v4(), 'SALE_RECEIPT',     'SMS',      'Sale Receipt SMS',
   NULL, 'Hi {{customer_name}}, your receipt #{{ref}} total {{total}}. Thanks!', FALSE, TRUE),
  (uuid_generate_v4(), 'QUOTATION_SENT',   'EMAIL',    'Quotation',
   'Quotation {{ref}} from {{company_name}}',
   '<p>Hi {{customer_name}},</p><p>Please find your quotation {{ref}} attached.</p>', TRUE, TRUE),
  (uuid_generate_v4(), 'PURCHASE_ORDER',   'EMAIL',    'Purchase Order',
   'Purchase Order {{ref}}', '<p>Order details: {{ref}} – total {{total}}.</p>', TRUE, TRUE),
  (uuid_generate_v4(), 'RETURN_CONFIRM',   'EMAIL',    'Return Confirmation',
   'Return processed', '<p>Your return {{ref}} has been processed.</p>', TRUE, TRUE),
  (uuid_generate_v4(), 'WARRANTY_EXPIRY',  'SMS',      'Warranty Expiry Reminder',
   NULL, 'Hi {{customer_name}}, your warranty for {{product_name}} expires on {{warranty_end}}.', FALSE, TRUE);
