-- V25: Custom Domain — white-label domain support for tenant branding

ALTER TABLE brand_profiles
    ADD COLUMN custom_domain                VARCHAR(255),
    ADD COLUMN custom_domain_verified       BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN custom_domain_verification_token VARCHAR(64);

COMMENT ON COLUMN brand_profiles.custom_domain IS 'Custom domain e.g. pos.mybusiness.com';
COMMENT ON COLUMN brand_profiles.custom_domain_verified IS 'True after TXT record DNS verification';
COMMENT ON COLUMN brand_profiles.custom_domain_verification_token IS 'Random token for DNS TXT record letispos-verify={token}';

CREATE INDEX idx_brand_profiles_domain ON brand_profiles(custom_domain) WHERE custom_domain IS NOT NULL;
