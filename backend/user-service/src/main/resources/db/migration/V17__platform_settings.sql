-- Platform Settings: centralized key-value store for platform-wide configuration.
-- Stores API keys, provider configs, and feature toggles across all services.

CREATE TABLE IF NOT EXISTS platform_settings (
    key         VARCHAR(100) PRIMARY KEY,
    value       TEXT,
    category    VARCHAR(50)  NOT NULL DEFAULT 'general',
    label       VARCHAR(255) NOT NULL,
    description TEXT,
    encrypted   BOOLEAN      NOT NULL DEFAULT false,
    created_at  TIMESTAMP    NOT NULL DEFAULT now(),
    updated_at  TIMESTAMP
);

-- Seed existing configuration keys so super admins can manage them.
-- Values are NULL — the admin fills them in, or services fall back to env vars.
INSERT INTO platform_settings (key, value, category, label, description, encrypted) VALUES
    -- AI Providers
    ('ai.provider', 'openai', 'ai', 'AI Provider', 'openai, anthropic, or deepseek', false),
    ('ai.openai.api_key', NULL, 'ai', 'OpenAI API Key', 'Required when provider is openai', true),
    ('ai.openai.model', 'gpt-4o-mini', 'ai', 'OpenAI Model', 'e.g. gpt-4o, gpt-4o-mini', false),
    ('ai.openai.base_url', 'https://api.openai.com/v1', 'ai', 'OpenAI Base URL', 'API endpoint (or proxy)', false),
    ('ai.anthropic.api_key', NULL, 'ai', 'Anthropic API Key', 'Required when provider is anthropic', true),
    ('ai.anthropic.model', 'claude-sonnet-4-6', 'ai', 'Anthropic Model', 'e.g. claude-sonnet-4-6', false),
    ('ai.deepseek.api_key', NULL, 'ai', 'DeepSeek API Key', 'Required when provider is deepseek', true),
    ('ai.deepseek.model', 'deepseek-chat', 'ai', 'DeepSeek Model', 'e.g. deepseek-chat', false),
    -- Email
    ('email.provider', 'resend', 'email', 'Email Provider', 'resend, sendgrid, or smtp', false),
    ('email.resend.api_key', NULL, 'email', 'Resend API Key', 'API key from resend.com', true),
    ('email.from_address', 'noreply@send.letispos.com', 'email', 'From Address', 'Sender email', false),
    ('email.from_name', 'LetisPOS', 'email', 'From Name', 'Sender display name', false),
    -- SMS / WhatsApp
    ('sms.provider', 'twilio', 'sms', 'SMS Provider', 'twilio or africas-talking', false),
    ('sms.twilio.account_sid', NULL, 'sms', 'Twilio Account SID', 'From Twilio console', true),
    ('sms.twilio.auth_token', NULL, 'sms', 'Twilio Auth Token', 'From Twilio console', true),
    ('sms.twilio.phone_number', NULL, 'sms', 'Twilio Phone Number', 'e.g. +255123456789', false),
    ('sms.twilio.whatsapp_number', NULL, 'sms', 'Twilio WhatsApp Number', 'e.g. whatsapp:+14155238886', false),
    -- Payments
    ('payment.stripe.enabled', 'false', 'payment', 'Stripe Enabled', 'Enable Stripe payment processing', false),
    ('payment.stripe.secret_key', NULL, 'payment', 'Stripe Secret Key', 'sk_live_... or sk_test_...', true),
    ('payment.stripe.webhook_secret', NULL, 'payment', 'Stripe Webhook Secret', 'whsec_...', true),
    ('payment.stripe.price_starter_monthly', NULL, 'payment', 'Stripe Price: Starter Monthly', 'Stripe price ID', false),
    ('payment.stripe.price_business_monthly', NULL, 'payment', 'Stripe Price: Business Monthly', 'Stripe price ID', false),
    ('payment.stripe.price_professional_monthly', NULL, 'payment', 'Stripe Price: Professional Monthly', 'Stripe price ID', false),
    ('payment.mpesa.enabled', 'false', 'payment', 'M-Pesa Enabled', 'Enable M-Pesa payments', false),
    ('payment.mpesa.consumer_key', NULL, 'payment', 'M-Pesa Consumer Key', 'From Daraja portal', true),
    ('payment.mpesa.consumer_secret', NULL, 'payment', 'M-Pesa Consumer Secret', 'From Daraja portal', true),
    ('payment.mpesa.passkey', NULL, 'payment', 'M-Pesa Passkey', 'From Daraja portal', true),
    ('payment.mpesa.shortcode', NULL, 'payment', 'M-Pesa Shortcode', 'Business shortcode', false)
ON CONFLICT (key) DO NOTHING;
