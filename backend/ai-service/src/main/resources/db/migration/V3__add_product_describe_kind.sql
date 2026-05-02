-- Allow PRODUCT_DESCRIBE kind on ai_invocations.
-- ProductAiService.describe() writes this kind; V2 added SUGGEST + IMPORT_MAP
-- but missed DESCRIBE, causing inserts to fail the check constraint.

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
        'PRODUCT_DESCRIBE'
    ));
