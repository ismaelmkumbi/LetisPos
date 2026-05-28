-- V24: Brand Inheritance — parent/child brand profiles with locked fields

ALTER TABLE brand_profiles
    ADD COLUMN parent_brand_id        UUID REFERENCES brand_profiles(id),
    ADD COLUMN inheritance_mode       VARCHAR(20) NOT NULL DEFAULT 'full_override',
    ADD COLUMN locked_fields          JSONB;

COMMENT ON COLUMN brand_profiles.parent_brand_id IS 'Parent brand for inheritance — NULL means independent brand';
COMMENT ON COLUMN brand_profiles.inheritance_mode IS 'full_override | inherit_with_overrides | locked';
COMMENT ON COLUMN brand_profiles.locked_fields IS 'JSON array of field names the parent locks (only when mode = locked)';

CREATE INDEX idx_brand_profiles_parent ON brand_profiles(parent_brand_id);
