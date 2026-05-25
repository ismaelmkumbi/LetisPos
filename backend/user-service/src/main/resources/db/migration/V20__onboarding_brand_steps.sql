-- Add brand & document-theme steps to onboarding state so the
-- SetupWizard can track the self-service brand-identity workflow.

ALTER TABLE user_onboarding_state
    ADD COLUMN IF NOT EXISTS brand_completed BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS document_theme_completed BOOLEAN NOT NULL DEFAULT false;
