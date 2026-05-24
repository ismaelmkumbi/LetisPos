-- Add service grouping columns to platform_settings for better UX.
-- Each setting belongs to a service (e.g. "openai", "twilio", "stripe").
-- The admin panel shows services as table rows; click opens a detail modal.

ALTER TABLE platform_settings
    ADD COLUMN IF NOT EXISTS service_key  VARCHAR(50),
    ADD COLUMN IF NOT EXISTS service_name VARCHAR(100),
    ADD COLUMN IF NOT EXISTS service_icon VARCHAR(50),
    ADD COLUMN IF NOT EXISTS sort_order   INT NOT NULL DEFAULT 0;

-- Assign service groupings to existing settings
UPDATE platform_settings SET service_key = 'openai',    service_name = 'OpenAI',          service_icon = 'brain'           WHERE key LIKE 'ai.openai.%' OR key = 'ai.provider';
UPDATE platform_settings SET service_key = 'anthropic',  service_name = 'Anthropic',       service_icon = 'brain'           WHERE key LIKE 'ai.anthropic.%';
UPDATE platform_settings SET service_key = 'deepseek',   service_name = 'DeepSeek',        service_icon = 'brain'           WHERE key LIKE 'ai.deepseek.%';
UPDATE platform_settings SET service_key = 'resend',     service_name = 'Resend',          service_icon = 'mail'            WHERE key LIKE 'email.resend.%';
UPDATE platform_settings SET service_key = 'twilio',     service_name = 'Twilio',          service_icon = 'message'         WHERE key LIKE 'sms.twilio.%';
UPDATE platform_settings SET service_key = 'stripe',     service_name = 'Stripe',          service_icon = 'credit-card'     WHERE key LIKE 'payment.stripe.%';
UPDATE platform_settings SET service_key = 'mpesa',      service_name = 'M-Pesa (Daraja)', service_icon = 'cash'            WHERE key LIKE 'payment.mpesa.%';

-- Sort orders
UPDATE platform_settings SET sort_order = 1  WHERE service_key = 'openai';
UPDATE platform_settings SET sort_order = 2  WHERE service_key = 'anthropic';
UPDATE platform_settings SET sort_order = 3  WHERE service_key = 'deepseek';
UPDATE platform_settings SET sort_order = 10 WHERE service_key = 'resend';
UPDATE platform_settings SET sort_order = 20 WHERE service_key = 'twilio';
UPDATE platform_settings SET sort_order = 30 WHERE service_key = 'stripe';
UPDATE platform_settings SET sort_order = 40 WHERE service_key = 'mpesa';

-- Set per-setting sort within service
UPDATE platform_settings SET sort_order = 1 WHERE key = 'ai.openai.api_key';
UPDATE platform_settings SET sort_order = 2 WHERE key = 'ai.openai.model';
UPDATE platform_settings SET sort_order = 3 WHERE key = 'ai.openai.base_url';
UPDATE platform_settings SET sort_order = 1 WHERE key = 'ai.anthropic.api_key';
UPDATE platform_settings SET sort_order = 2 WHERE key = 'ai.anthropic.model';
UPDATE platform_settings SET sort_order = 1 WHERE key = 'ai.deepseek.api_key';
UPDATE platform_settings SET sort_order = 2 WHERE key = 'ai.deepseek.model';
UPDATE platform_settings SET sort_order = 1 WHERE key = 'email.resend.api_key';
UPDATE platform_settings SET sort_order = 2 WHERE key = 'email.from_address';
UPDATE platform_settings SET sort_order = 3 WHERE key = 'email.from_name';
UPDATE platform_settings SET sort_order = 1 WHERE key = 'sms.twilio.account_sid';
UPDATE platform_settings SET sort_order = 2 WHERE key = 'sms.twilio.auth_token';
UPDATE platform_settings SET sort_order = 3 WHERE key = 'sms.twilio.phone_number';
UPDATE platform_settings SET sort_order = 4 WHERE key = 'sms.twilio.whatsapp_number';
UPDATE platform_settings SET sort_order = 1 WHERE key = 'payment.stripe.enabled';
UPDATE platform_settings SET sort_order = 2 WHERE key = 'payment.stripe.secret_key';
UPDATE platform_settings SET sort_order = 3 WHERE key = 'payment.stripe.webhook_secret';
UPDATE platform_settings SET sort_order = 1 WHERE key = 'payment.mpesa.enabled';
UPDATE platform_settings SET sort_order = 2 WHERE key = 'payment.mpesa.consumer_key';
UPDATE platform_settings SET sort_order = 3 WHERE key = 'payment.mpesa.consumer_secret';
UPDATE platform_settings SET sort_order = 4 WHERE key = 'payment.mpesa.passkey';
UPDATE platform_settings SET sort_order = 5 WHERE key = 'payment.mpesa.shortcode';
