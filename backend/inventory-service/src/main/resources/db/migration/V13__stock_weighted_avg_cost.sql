-- Add weighted average cost tracking to stock_levels
ALTER TABLE stock_levels
    ADD COLUMN IF NOT EXISTS weighted_avg_cost NUMERIC(19,4) NOT NULL DEFAULT 0;

ALTER TABLE stock_levels
    ADD CONSTRAINT stock_levels_wac_nonneg CHECK (weighted_avg_cost >= 0);
