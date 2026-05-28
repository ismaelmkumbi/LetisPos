-- V26: Brand Profile Versions — audit log for brand changes

CREATE TABLE brand_profile_versions (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    brand_profile_id UUID NOT NULL REFERENCES brand_profiles(id) ON DELETE CASCADE,
    version_number  INT NOT NULL,
    snapshot        JSONB NOT NULL,
    changed_by      VARCHAR(255),
    change_summary  TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX uq_brand_version_number ON brand_profile_versions(brand_profile_id, version_number);
CREATE INDEX idx_brand_versions_profile ON brand_profile_versions(brand_profile_id);
CREATE INDEX idx_brand_versions_created ON brand_profile_versions(created_at DESC);

-- Seed version 1 for all existing brand profiles
INSERT INTO brand_profile_versions (brand_profile_id, version_number, snapshot, change_summary)
SELECT
    id AS brand_profile_id,
    1 AS version_number,
    to_jsonb(brand_profiles.*) AS snapshot,
    'Initial version' AS change_summary
FROM brand_profiles;
