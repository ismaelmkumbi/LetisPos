-- Allow ASSISTANT_CHAT invocation kind emitted by AssistantService.

ALTER TABLE ai_invocations DROP CONSTRAINT IF EXISTS ai_invocations_kind_chk;

ALTER TABLE ai_invocations
    ADD CONSTRAINT ai_invocations_kind_chk
    CHECK (kind IN (
        'SALES_TREND',
        'NARRATE_REPORT',
        'FORECAST',
        'ANOMALY',
        'ANOMALY_DETECT',
        'RECOMMENDATIONS',
        'CHAT',
        'ASSISTANT_CHAT',
        'PRODUCT_SUGGEST',
        'PRODUCT_IMPORT_MAP',
        'PRODUCT_DESCRIBE',
        'PRODUCT_FROM_IMAGE',
        'PRODUCT_CANDIDATES',
        'PRODUCT_IMPORT_FROM_IMAGE'
    ));
