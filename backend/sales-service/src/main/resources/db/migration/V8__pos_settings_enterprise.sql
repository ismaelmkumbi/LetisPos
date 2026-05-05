-- Enterprise extensions to pos_settings
-- Adds locale, POS behaviour, discount rules, loyalty, sale-reference,
-- store branding, and notification preferences.

ALTER TABLE pos_settings

  -- ── Store branding ──────────────────────────────────────────────────
  ADD COLUMN IF NOT EXISTS logo_url             VARCHAR(512)   NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS store_website        VARCHAR(255)   NOT NULL DEFAULT '',

  -- ── Locale / regional ───────────────────────────────────────────────
  ADD COLUMN IF NOT EXISTS timezone             VARCHAR(64)    NOT NULL DEFAULT 'Africa/Dar_es_Salaam',
  ADD COLUMN IF NOT EXISTS date_format          VARCHAR(32)    NOT NULL DEFAULT 'dd/MM/yyyy',
  ADD COLUMN IF NOT EXISTS time_format          VARCHAR(16)    NOT NULL DEFAULT 'HH:mm',

  -- ── POS behaviour ───────────────────────────────────────────────────
  ADD COLUMN IF NOT EXISTS allow_negative_stock      BOOLEAN  NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS require_customer_on_sale  BOOLEAN  NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS require_note_on_sale      BOOLEAN  NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS low_stock_threshold       INTEGER  NOT NULL DEFAULT 10,
  ADD COLUMN IF NOT EXISTS enable_sound              BOOLEAN  NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS kiosk_idle_timeout_sec    INTEGER  NOT NULL DEFAULT 120,

  -- ── Sale reference numbering ─────────────────────────────────────────
  ADD COLUMN IF NOT EXISTS sale_ref_prefix      VARCHAR(16)    NOT NULL DEFAULT 'INV-',
  ADD COLUMN IF NOT EXISTS sale_ref_padding     SMALLINT       NOT NULL DEFAULT 4,

  -- ── Discount & approval rules ────────────────────────────────────────
  ADD COLUMN IF NOT EXISTS max_discount_percent     DECIMAL(5,2)   NOT NULL DEFAULT 100.00,
  ADD COLUMN IF NOT EXISTS require_pin_for_discount BOOLEAN        NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS manager_approval_above   DECIMAL(12,2),   -- NULL = disabled

  -- ── Loyalty programme ───────────────────────────────────────────────
  ADD COLUMN IF NOT EXISTS enable_loyalty            BOOLEAN        NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS loyalty_points_per_unit   DECIMAL(8,4)   NOT NULL DEFAULT 1.0000,
  ADD COLUMN IF NOT EXISTS loyalty_value_per_point   DECIMAL(8,4)   NOT NULL DEFAULT 0.0100,
  ADD COLUMN IF NOT EXISTS loyalty_min_redeem_points INTEGER        NOT NULL DEFAULT 100,

  -- ── Notifications / alerts ───────────────────────────────────────────
  ADD COLUMN IF NOT EXISTS low_stock_alert_enabled  BOOLEAN  NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS daily_summary_enabled    BOOLEAN  NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS alert_email              VARCHAR(128) NOT NULL DEFAULT '';

COMMENT ON COLUMN pos_settings.timezone             IS 'Java ZoneId string, e.g. Africa/Dar_es_Salaam';
COMMENT ON COLUMN pos_settings.date_format          IS 'Java DateTimeFormatter pattern';
COMMENT ON COLUMN pos_settings.sale_ref_padding     IS 'Zero-pad width for sale reference numbers, e.g. 4 → INV-0001';
COMMENT ON COLUMN pos_settings.manager_approval_above IS 'Require manager PIN for discounts above this amount; NULL = disabled';
COMMENT ON COLUMN pos_settings.loyalty_points_per_unit IS 'Points awarded per 1 currency unit spent';
COMMENT ON COLUMN pos_settings.loyalty_value_per_point IS 'Currency value of 1 loyalty point at redemption';
