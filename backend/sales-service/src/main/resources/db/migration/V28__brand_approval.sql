-- V28: Brand Approval — draft/publish workflow + status column

ALTER TABLE brand_profiles
    ADD COLUMN status VARCHAR(20) NOT NULL DEFAULT 'published';

COMMENT ON COLUMN brand_profiles.status IS 'draft | pending_review | published | archived';

CREATE INDEX idx_brand_profiles_status ON brand_profiles(status);
