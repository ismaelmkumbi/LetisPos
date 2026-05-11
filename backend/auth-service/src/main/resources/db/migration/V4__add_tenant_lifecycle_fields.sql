ALTER TABLE tenants ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS status_changed_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS status_reason VARCHAR(500);

-- Set trial_ends_at to 30 days from creation for existing tenants
UPDATE tenants SET trial_ends_at = created_at + INTERVAL '30 days'
  WHERE trial_ends_at IS NULL;

-- Update check constraint to include new status values
ALTER TABLE tenants DROP CONSTRAINT IF EXISTS tenants_status_chk;
ALTER TABLE tenants ADD CONSTRAINT tenants_status_chk
  CHECK (status IN ('TRIAL','TRIAL_EXPIRED','ACTIVE','PAST_DUE','SUSPENDED','CLOSED'));
