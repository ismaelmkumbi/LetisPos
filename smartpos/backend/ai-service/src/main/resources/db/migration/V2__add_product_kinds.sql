-- Extend ai_invocations.kind to allow product-AI flows.
-- V1 only listed: SALES_TREND, NARRATE_REPORT, FORECAST, ANOMALY, CHAT.
-- ProductAiService writes PRODUCT_SUGGEST and PRODUCT_IMPORT_MAP rows.

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
        'PRODUCT_IMPORT_MAP'
    ));
