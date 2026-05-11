-- V8: Damage & waste with two-step approval workflow
ALTER TABLE adjustments ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'APPROVED';
ALTER TABLE adjustments ADD COLUMN IF NOT EXISTS reason_code VARCHAR(30);
ALTER TABLE adjustments ADD COLUMN IF NOT EXISTS approved_by UUID;
ALTER TABLE adjustments ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;
ALTER TABLE adjustments ADD COLUMN IF NOT EXISTS rejected_reason TEXT;

-- Migrate the status constraint: old constraint only allowed DRAFT; new one
-- allows the full approval lifecycle.  Use a DO block so the script is
-- re-runnable.
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'adjustments_status_chk') THEN
        ALTER TABLE adjustments DROP CONSTRAINT adjustments_status_chk;
    END IF;
    ALTER TABLE adjustments ADD CONSTRAINT adjustments_status_chk
        CHECK (status IN ('DRAFT','PENDING_REVIEW','APPROVED','REJECTED'));
END $$;
