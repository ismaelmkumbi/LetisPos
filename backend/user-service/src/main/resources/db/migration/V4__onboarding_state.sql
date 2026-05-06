-- Onboarding state tracking for new users.
-- Each row tracks whether a user has completed setup steps.
-- Auto-detected steps (warehouse, tax, products, first_sale) may be filled
-- by the frontend PATCHing after the user completes them.

CREATE TABLE user_onboarding_state (
    user_id              UUID         PRIMARY KEY REFERENCES user_profiles(id) ON DELETE CASCADE,
    workspace_completed  BOOLEAN      NOT NULL DEFAULT TRUE,  -- true for all: tenant created at registration
    warehouse_completed  BOOLEAN      NOT NULL DEFAULT FALSE,
    tax_completed        BOOLEAN      NOT NULL DEFAULT FALSE,
    products_completed   BOOLEAN      NOT NULL DEFAULT FALSE,
    staff_completed      BOOLEAN      NOT NULL DEFAULT FALSE,
    first_sale_completed BOOLEAN      NOT NULL DEFAULT FALSE,
    completed_at         TIMESTAMPTZ,
    created_at           TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at           TIMESTAMPTZ  NOT NULL DEFAULT now()
);

-- Index for tenant-level onboarding analytics (how many users are stuck at step N)
CREATE INDEX idx_user_onboarding_state_tenant
    ON user_onboarding_state (user_id);
