-- User Service V2 — i18n catalogue
--
-- Stocky ships 24+ languages and lets admins add new languages from the UI
-- without code changes. We model this as:
--   languages   — registered locales (code, name, RTL flag, enabled)
--   translations — (language_code, key) → value
--
-- The frontend fetches the bundle for a single locale via GET /i18n/{lang}.
-- Admins manage entries via the CRUD endpoints; missing keys fall back to
-- the system locale (typically "en").

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE languages (
    id          UUID         PRIMARY KEY,
    code        VARCHAR(10)  NOT NULL,                       -- BCP-47, e.g. "en", "fr-CA", "ar"
    name        VARCHAR(80)  NOT NULL,                       -- "English", "Français (CA)"
    rtl         BOOLEAN      NOT NULL DEFAULT FALSE,
    enabled     BOOLEAN      NOT NULL DEFAULT TRUE,
    is_default  BOOLEAN      NOT NULL DEFAULT FALSE,
    tenant_id   UUID,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX idx_languages_tenant_code ON languages (tenant_id, lower(code));
CREATE UNIQUE INDEX idx_languages_default ON languages (tenant_id) WHERE is_default = TRUE;

CREATE TABLE translations (
    id              UUID         PRIMARY KEY,
    language_code   VARCHAR(10)  NOT NULL,
    namespace       VARCHAR(60)  NOT NULL DEFAULT 'app',     -- e.g. "pos", "report", "settings"
    key             VARCHAR(200) NOT NULL,
    value           TEXT         NOT NULL,
    tenant_id       UUID,
    updated_at      TIMESTAMPTZ  NOT NULL DEFAULT now(),
    UNIQUE (tenant_id, language_code, namespace, key)
);
CREATE INDEX idx_translations_lookup ON translations (language_code, namespace, key);

-- Seed the 24 baseline languages (codes only — translations imported separately).
INSERT INTO languages (id, code, name, rtl, is_default, enabled) VALUES
  (uuid_generate_v4(), 'en',    'English',      FALSE, TRUE,  TRUE),
  (uuid_generate_v4(), 'es',    'Español',      FALSE, FALSE, TRUE),
  (uuid_generate_v4(), 'fr',    'Français',     FALSE, FALSE, TRUE),
  (uuid_generate_v4(), 'de',    'Deutsch',      FALSE, FALSE, TRUE),
  (uuid_generate_v4(), 'pt',    'Português',    FALSE, FALSE, TRUE),
  (uuid_generate_v4(), 'it',    'Italiano',     FALSE, FALSE, TRUE),
  (uuid_generate_v4(), 'ar',    'العربية',      TRUE,  FALSE, TRUE),
  (uuid_generate_v4(), 'he',    'עברית',         TRUE,  FALSE, TRUE),
  (uuid_generate_v4(), 'fa',    'فارسی',         TRUE,  FALSE, TRUE),
  (uuid_generate_v4(), 'zh-CN', '简体中文',       FALSE, FALSE, TRUE),
  (uuid_generate_v4(), 'zh-TW', '繁體中文',       FALSE, FALSE, TRUE),
  (uuid_generate_v4(), 'ja',    '日本語',         FALSE, FALSE, TRUE),
  (uuid_generate_v4(), 'ko',    '한국어',         FALSE, FALSE, TRUE),
  (uuid_generate_v4(), 'hi',    'हिन्दी',           FALSE, FALSE, TRUE),
  (uuid_generate_v4(), 'bn',    'বাংলা',          FALSE, FALSE, TRUE),
  (uuid_generate_v4(), 'ur',    'اردو',          TRUE,  FALSE, TRUE),
  (uuid_generate_v4(), 'tr',    'Türkçe',       FALSE, FALSE, TRUE),
  (uuid_generate_v4(), 'ru',    'Русский',      FALSE, FALSE, TRUE),
  (uuid_generate_v4(), 'pl',    'Polski',       FALSE, FALSE, TRUE),
  (uuid_generate_v4(), 'nl',    'Nederlands',   FALSE, FALSE, TRUE),
  (uuid_generate_v4(), 'sw',    'Kiswahili',    FALSE, FALSE, TRUE),
  (uuid_generate_v4(), 'id',    'Bahasa Indonesia', FALSE, FALSE, TRUE),
  (uuid_generate_v4(), 'vi',    'Tiếng Việt',   FALSE, FALSE, TRUE),
  (uuid_generate_v4(), 'th',    'ไทย',           FALSE, FALSE, TRUE);
