-- Allow the report-AI invocation kinds emitted by RecommendationService and
-- AnomalyService. RECOMMENDATIONS — business recommendations grounded on a
-- report payload. ANOMALY_DETECT — flags outliers / risky deltas in a report.

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
        'PRODUCT_SUGGEST',
        'PRODUCT_IMPORT_MAP',
        'PRODUCT_DESCRIBE',
        'PRODUCT_FROM_IMAGE',
        'PRODUCT_CANDIDATES',
        'PRODUCT_IMPORT_FROM_IMAGE'
    ));
