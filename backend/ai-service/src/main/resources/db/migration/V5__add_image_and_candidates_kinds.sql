-- Allow PRODUCT_FROM_IMAGE (vision flow) and PRODUCT_CANDIDATES
-- (disambiguation flow) on ai_invocations.

ALTER TABLE ai_invocations DROP CONSTRAINT IF EXISTS ai_invocations_kind_chk;

ALTER TABLE ai_invocations
    ADD CONSTRAINT ai_invocations_kind_chk
    CHECK (kind IN (
        'SALES_TREND',
        'NARRATE_REPORT',
        'FORECAST',
        'ANOMALY',
        'CHAT',
        'PRODUCT_SUGGEST',
        'PRODUCT_IMPORT_MAP',
        'PRODUCT_DESCRIBE',
        'PRODUCT_FROM_IMAGE',
        'PRODUCT_CANDIDATES'
    ));
