ALTER TABLE adjustment_lines
    ADD COLUMN IF NOT EXISTS unit_cost DECIMAL(19,4);
