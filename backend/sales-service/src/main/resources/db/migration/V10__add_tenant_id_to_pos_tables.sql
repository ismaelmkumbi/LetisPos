ALTER TABLE cash_register_sessions ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE pos_settings ADD COLUMN IF NOT EXISTS tenant_id UUID;
